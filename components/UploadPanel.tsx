'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface UploadResult {
  success: boolean
  message?: string
  inserted?: number
  duplicates?: string[]
  duplicatesInFile?: string[]
  duplicatesInDatabase?: string[]
  error?: string
}

export default function UploadPanel() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile)
        setResult(null)
      } else {
        setResult({
          success: false,
          error: 'Formato não suportado. Use arquivos .xlsx ou .xls'
        })
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile)
        setResult(null)
      } else {
        setResult({
          success: false,
          error: 'Formato não suportado. Use arquivos .xlsx ou .xls'
        })
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          inserted: data.inserted,
          duplicates: data.duplicates,
        })
        setFile(null)
        
        // Recarregar após 3 segundos
        setTimeout(() => {
          window.location.href = '/'
        }, 3000)
      } else {
        setResult({
          success: false,
          error: data.error || data.message || 'Erro ao fazer upload',
          duplicates: data.duplicates,
        })
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: 'Erro ao conectar com o servidor: ' + error.message,
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Importar Dados</h1>
              <p className="text-sm text-gray-500 mt-1">Upload de planilhas para o banco de dados</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-6 h-6" />
            Importar Planilha
          </h2>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Faça upload de uma planilha Excel (.xlsx ou .xls) com os dados semanais.
            </p>
            <p className="text-xs text-gray-500">
              A planilha deve conter as colunas: Período, PA Semanal, PA Acumulado Mês, PA Acumulado Ano, etc.
            </p>
          </div>

          {/* Área de upload */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet className="w-12 h-12 text-green-600" />
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <button
                  onClick={() => setFile(null)}
                  className="text-sm text-red-600 hover:text-red-700 mt-2 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Remover arquivo
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-12 h-12 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Arraste e solte o arquivo aqui ou
                </p>
                <label className="cursor-pointer">
                  <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    selecione um arquivo
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Botão de upload */}
          {file && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Fazer Upload
                </>
              )}
            </button>
          )}

          {/* Resultado do upload */}
          {result && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      result.success ? 'text-green-900' : 'text-red-900'
                    }`}
                  >
                    {result.success ? 'Sucesso!' : 'Erro'}
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      result.success ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {result.message || result.error}
                  </p>
                  {result.inserted !== undefined && (
                    <p className="text-xs text-green-600 mt-1">
                      {result.inserted} registro(s) inserido(s)
                    </p>
                  )}
                  {result.duplicates && result.duplicates.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {result.duplicatesInFile && result.duplicatesInFile.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-orange-800">
                            Duplicados na planilha ({result.duplicatesInFile.length}):
                          </p>
                          <ul className="text-xs text-orange-700 list-disc list-inside">
                            {result.duplicatesInFile.slice(0, 3).map((dup, idx) => (
                              <li key={idx}>{dup}</li>
                            ))}
                            {result.duplicatesInFile.length > 3 && (
                              <li>... e mais {result.duplicatesInFile.length - 3}</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {result.duplicatesInDatabase && result.duplicatesInDatabase.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-yellow-800">
                            Já existem no banco ({result.duplicatesInDatabase.length}):
                          </p>
                          <ul className="text-xs text-yellow-700 list-disc list-inside">
                            {result.duplicatesInDatabase.slice(0, 3).map((dup, idx) => (
                              <li key={idx}>{dup}</li>
                            ))}
                            {result.duplicatesInDatabase.length > 3 && (
                              <li>... e mais {result.duplicatesInDatabase.length - 3}</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instruções */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            📋 Instruções de Formato
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>Formato suportado:</strong> Excel (.xlsx, .xls)
            </p>
            <p>
              <strong>Colunas esperadas:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Período (ex: "18/08 a 24/08")</li>
              <li>PA Semanal</li>
              <li>PA Acumulado Mês</li>
              <li>PA Acumulado Ano</li>
              <li>Meta PA Semanal</li>
              <li>% Meta PA Semana</li>
              <li>% Meta PA Ano</li>
              <li>PA Emitido</li>
              <li>Apólices Emitidas</li>
              <li>Meta N Semanal</li>
              <li>N Semana</li>
              <li>N Acumulado Mês</li>
              <li>N Acumulado Ano</li>
              <li>% Meta N Semana</li>
              <li>% Meta N Ano</li>
              <li>Meta OIs Agendadas</li>
              <li>OIs Agendadas</li>
              <li>OIs Realizadas</li>
            </ul>
            <p className="mt-3">
              <strong>Nota:</strong> Períodos duplicados serão ignorados automaticamente.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

