import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Vite dev middleware to handle local-first attendance photo upload & queue
function attendanceApiPlugin(): Plugin {
  return {
    name: 'attendance-api-middleware',
    configureServer(server) {
      const uploadDir = path.resolve(__dirname, 'public/uploads/attendance')
      const queueFile = path.resolve(__dirname, 'public/uploads/upload_queue.json')

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      server.middlewares.use((req, res, next) => {
        if (req.method === 'POST' && req.url === '/api/attendance/check-in') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', () => {
            try {
              const payload = JSON.parse(body)
              const { empId, name, date, time, imageBase64 } = payload

              if (!imageBase64) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Image required' }))
                return
              }

              const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
              const buffer = Buffer.from(base64Data, 'base64')
              const filename = `att_${Date.now()}_${(empId || 'EMP').toUpperCase()}.jpg`
              const filePath = path.join(uploadDir, filename)

              fs.writeFileSync(filePath, buffer)
              const localPhotoPath = `/uploads/attendance/${filename}`

              // Queue entry
              let queue: any[] = []
              try {
                if (fs.existsSync(queueFile)) {
                  queue = JSON.parse(fs.readFileSync(queueFile, 'utf-8'))
                }
              } catch {}

              queue.push({
                id: `queue_${Date.now()}`,
                empId: empId || '',
                name: name || '',
                date: date || '',
                time: time || '',
                localPath: localPhotoPath,
                status: 'pending',
                retryCount: 0,
                createdAt: new Date().toISOString(),
              })

              try {
                fs.writeFileSync(queueFile, JSON.stringify(queue, null, 2), 'utf-8')
              } catch {}

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true, localPhotoPath }))
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Failed to save local photo' }))
            }
          })
          return
        }

        if (req.method === 'GET' && req.url === '/api/attendance/queue-status') {
          let queue: any[] = []
          try {
            if (fs.existsSync(queueFile)) {
              queue = JSON.parse(fs.readFileSync(queueFile, 'utf-8'))
            }
          } catch {}
          const pending = queue.filter((q) => q.status === 'pending').length
          const uploaded = queue.filter((q) => q.status === 'uploaded').length
          const failed = queue.filter((q) => q.status === 'failed').length
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ pending, uploaded, failed, total: queue.length }))
          return
        }

        next()
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), attendanceApiPlugin()],
})
