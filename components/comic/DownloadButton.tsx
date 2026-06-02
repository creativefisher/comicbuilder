'use client'

import { useState } from 'react'

interface Props {
  title: string
}

export function DownloadButton({ title }: Props) {
  const [loading, setLoading] = useState(false)

  async function download() {
    setLoading(true)
    try {
      // Dynamic import to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const el = document.querySelector('.comic-page') as HTMLElement
      if (!el) return

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#f5f0e8',
      })

      const imgWidth = 210 // A4 mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const pdf = new jsPDF({
        orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, imgWidth, imgHeight)
      pdf.save(`${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={download}
      disabled={loading}
      className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors shadow"
    >
      {loading ? '⏳ Preparing...' : '⬇️ Download PDF'}
    </button>
  )
}
