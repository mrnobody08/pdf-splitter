'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from "@/components/ui/button"
import PdfViewer from '@/components/PdfViewer'

export default function Home() {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [selectedPages, setSelectedPages] = useState<number[]>([])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      setPdfFile(acceptedFiles[0])
      setSelectedPages([])
    }
  })

  const handleMergeAndDownload = async () => {
    if (!pdfFile || selectedPages.length === 0) return

    try {
      const fileBuffer = await pdfFile.arrayBuffer()
      const PDFLib = await import('pdf-lib')
      const pdfDoc = await PDFLib.PDFDocument.load(fileBuffer)
      const newPdfDoc = await PDFLib.PDFDocument.create()

      for (const pageNum of selectedPages) {
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNum - 1])
        newPdfDoc.addPage(copiedPage)
      }

      const newPdfBytes = await newPdfDoc.save()
      
      const blob = new Blob([newPdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `selected_pages_${pdfFile.name}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF işleme hatası:', error)
      alert('PDF işlenirken bir hata oluştu.')
    }
  }

  return (
    <main className="container mx-auto p-4">
      {!pdfFile ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
        >
          <input {...getInputProps()} />
          <p>PDF dosyanızı sürükleyip bırakın veya tıklayarak seçin</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-lg font-medium">{pdfFile.name}</p>
            <Button variant="outline" onClick={() => setPdfFile(null)}>
              Dosyayı Kaldır
            </Button>
          </div>
          <PdfViewer
            file={pdfFile}
            selectedPages={selectedPages}
            setSelectedPages={setSelectedPages}
          />
          {selectedPages.length > 0 && (
            <div className="flex justify-end gap-2">
              <Button onClick={handleMergeAndDownload}>
                Seçili Sayfaları İndir ({selectedPages.length} sayfa)
              </Button>
            </div>
          )}
        </div>
      )}
    </main>
  )
}