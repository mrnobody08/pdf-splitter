'use client'

import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface PdfViewerProps {
  file: File
  selectedPages: number[]
  setSelectedPages: (pages: number[]) => void
}

export default function PdfViewer({ file, selectedPages, setSelectedPages }: PdfViewerProps) {
  const [pageCount, setPageCount] = useState(0)
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [highResPages, setHighResPages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)

  // Dosya boyutunu formatla
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  useEffect(() => {
    let pdfDocument: PDFDocumentProxy | null = null

    const loadPdf = async () => {
      setLoading(true)
      setLoadingProgress(0)
      try {
        const PDFJS = await import('pdfjs-dist')
        PDFJS.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.js',
          import.meta.url
        ).toString()

        const fileArrayBuffer = await file.arrayBuffer()
        pdfDocument = await PDFJS.getDocument({ data: fileArrayBuffer }).promise
        
        if (pdfDocument) {
          setPageCount(pdfDocument.numPages)
          const thumbs: string[] = []
          const highRes: string[] = []
          
          for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i)
            
            // Thumbnail için düşük çözünürlük
            const thumbViewport = page.getViewport({ scale: 0.5 })
            const thumbCanvas = document.createElement('canvas')
            const thumbCtx = thumbCanvas.getContext('2d')
            if (thumbCtx) {
              thumbCanvas.width = thumbViewport.width
              thumbCanvas.height = thumbViewport.height

              await page.render({
                canvasContext: thumbCtx,
                viewport: thumbViewport
              }).promise

              thumbs.push(thumbCanvas.toDataURL('image/jpeg', 0.8))
            }

            // Yüksek çözünürlüklü versiyon
            const highResViewport = page.getViewport({ scale: 2.0 })
            const highResCanvas = document.createElement('canvas')
            const highResCtx = highResCanvas.getContext('2d')
            if (highResCtx) {
              highResCanvas.width = highResViewport.width
              highResCanvas.height = highResViewport.height

              await page.render({
                canvasContext: highResCtx,
                viewport: highResViewport
              }).promise

              highRes.push(highResCanvas.toDataURL('image/jpeg', 0.9))
            }

            // İlerleme durumunu güncelle
            setLoadingProgress(Math.round((i / pdfDocument.numPages) * 100))
          }
          setThumbnails(thumbs)
          setHighResPages(highRes)
        }
      } catch (error) {
        console.error('PDF yükleme hatası:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPdf()

    return () => {
      if (pdfDocument) {
        pdfDocument.destroy()
      }
    }
  }, [file])

  const togglePage = (pageNum: number) => {
    if (selectedPages.includes(pageNum)) {
      setSelectedPages(selectedPages.filter(p => p !== pageNum))
    } else {
      setSelectedPages([...selectedPages, pageNum].sort((a, b) => a - b))
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <div className="text-lg">PDF sayfaları yükleniyor...</div>
        <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
        <div className="text-sm text-gray-500">{loadingProgress}%</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dosya Bilgileri */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-lg mb-2">Dosya Bilgileri</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Dosya Adı</p>
            <p className="font-medium truncate">{file.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Boyut</p>
            <p className="font-medium">{formatFileSize(file.size)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Toplam Sayfa</p>
            <p className="font-medium">{pageCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Seçili Sayfa</p>
            <p className="font-medium">{selectedPages.length}</p>
          </div>
        </div>
      </div>

      {/* Sayfalar Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {thumbnails.map((thumbnail, index) => (
          <Dialog key={index}>
            <div 
              className={`
                border-2 rounded-lg p-2 transition-colors
                ${selectedPages.includes(index + 1) 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200'}
              `}
            >
              <div className="relative group cursor-pointer">
                <div className="relative aspect-[1/1.4] mb-2 overflow-hidden">
                  <img 
                    src={thumbnail} 
                    alt={`Sayfa ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-contain bg-white transition-transform duration-200 group-hover:scale-105"
                  />
                  
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity" />
                  
                  <DialogTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Büyüt
                    </Button>
                  </DialogTrigger>
                </div>

                <div 
                  className="flex items-center justify-between px-2"
                  onClick={() => togglePage(index + 1)}
                >
                  <span>Sayfa {index + 1}</span>
                  <input 
                    type="checkbox"
                    checked={selectedPages.includes(index + 1)}
                    onChange={() => togglePage(index + 1)}
                    className="w-4 h-4"
                  />
                </div>
              </div>

              <DialogContent className="max-w-4xl">
                <div className="aspect-[1/1.4] relative">
                  <img 
                    src={highResPages[index]}
                    alt={`Sayfa ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-contain bg-white"
                  />
                </div>
              </DialogContent>
            </div>
          </Dialog>
        ))}
      </div>
    </div>
  )
}