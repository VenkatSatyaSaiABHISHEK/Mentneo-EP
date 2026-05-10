import { useState } from 'react'
import Papa from 'papaparse'
import Button from './Button'
import type { CsvEmployeeRow } from '../types/employee'
import { uploadEmployees } from '../services/employeeService'

const requiredFields: Array<keyof CsvEmployeeRow> = [
  'name',
  'email',
  'phone',
  'role',
  'salary',
  'joinDate',
]

const normalizeRow = (row: Record<string, string>) => {
  const normalized: CsvEmployeeRow = {
    name: row.name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? row['phone number'] ?? '',
    role: row.role ?? '',
    salary: row.salary ?? '',
    joinDate: row['join date'] ?? row.joindate ?? row['join_date'] ?? '',
  }

  return normalized
}

type CsvUploadProps = {
  onUploaded: () => void
}

export default function CsvUpload({ onUploaded }: CsvUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleFile = (file: File) => {
    setError('')
    setSuccess('')
    setIsUploading(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: async (results) => {
        try {
          const parsedRows = results.data as Record<string, string>[]
          const cleaned = parsedRows.map(normalizeRow)
          
          const missingFieldsRowIndex = cleaned.findIndex((row) =>
            requiredFields.some((field) => !row[field]?.trim())
          )

          if (missingFieldsRowIndex !== -1) {
            const missing = requiredFields.filter(f => !cleaned[missingFieldsRowIndex][f]?.trim())
            throw new Error(`Row ${missingFieldsRowIndex + 1} is missing required fields: ${missing.join(', ')}`)
          }

          await uploadEmployees(cleaned)
          setSuccess(`Uploaded ${cleaned.length} employee records.`)
          onUploaded()
        } catch (uploadError) {
          setError(
            uploadError instanceof Error
              ? uploadError.message
              : 'Upload failed. Please try again.'
          )
        } finally {
          setIsUploading(false)
        }
      },
      error: (parseError) => {
        setError(parseError.message)
        setIsUploading(false)
      },
    })
  }

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,name,email,phone,role,salary,join date\nJohn Doe,john@example.com,1234567890,Manager,75000,2026-05-01\n"
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "mentneo_employee_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">CSV upload</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Import employees</h3>
          <p className="mt-2 text-sm text-muted">
            CSV headers required: name, email, phone, role, salary, join date.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="md" onClick={handleDownloadTemplate}>
            Download Template
          </Button>
          <label className="relative cursor-pointer">
            <input
              type="file"
              accept=".csv"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  handleFile(file)
                }
              }}
              disabled={isUploading}
            />
            <Button variant="primary" size="md" className="pointer-events-none">
              Select CSV
            </Button>
          </label>
          {isUploading && (
            <span className="text-xs text-slate-600">Uploading...</span>
          )}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      {success && <p className="mt-4 text-sm text-emerald-700">{success}</p>}
    </div>
  )
}
