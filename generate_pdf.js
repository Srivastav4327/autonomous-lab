import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'

const mdPath = path.resolve('HELIX_Technical_Master_Specification_and_Sales_Playbook.md')
const pdfPath = path.resolve('HELIX_Technical_Master_Specification_and_Sales_Playbook.pdf')

const content = fs.readFileSync(mdPath, 'utf8')

const doc = new PDFDocument({
  margin: 40,
  size: 'A4',
  bufferPages: true,
})

const stream = fs.createWriteStream(pdfPath)
doc.pipe(stream)

// Cover Page / Header
doc.fillColor('#10140f').rect(0, 0, doc.page.width, 100).fill('#10140f')
doc.fillColor('#d6f25a').fontSize(24).text('HELIX — Closed-Loop Discovery OS', 40, 30)
doc.fillColor('#6fbfb4').fontSize(14).text('Technical Master Specification & Enterprise Sales Playbook', 40, 62)

doc.moveDown(4)

const lines = content.split('\n')

lines.forEach((line) => {
  if (doc.y > doc.page.height - 50) {
    doc.addPage()
  }

  if (line.startsWith('# ')) {
    doc.moveDown(1)
    doc.fillColor('#10140f').fontSize(18).font('Helvetica-Bold').text(line.replace('# ', ''))
    doc.moveDown(0.3)
  } else if (line.startsWith('## ')) {
    doc.moveDown(0.8)
    doc.fillColor('#243022').fontSize(14).font('Helvetica-Bold').text(line.replace('## ', ''))
    doc.moveDown(0.3)
  } else if (line.startsWith('### ')) {
    doc.moveDown(0.5)
    doc.fillColor('#4a5a46').fontSize(12).font('Helvetica-Bold').text(line.replace('### ', ''))
    doc.moveDown(0.2)
  } else if (line.startsWith('* ') || line.startsWith('- ')) {
    doc.fillColor('#222222').fontSize(10).font('Helvetica').text(`  •  ${line.substring(2)}`, { indent: 10 })
  } else if (line.startsWith('```')) {
    // skip raw fence indicator
  } else if (line.trim().startsWith('|') || line.trim().startsWith('┌') || line.trim().startsWith('│') || line.trim().startsWith('└')) {
    doc.fillColor('#1b261a').fontSize(8.5).font('Courier').text(line)
  } else if (line.trim().length > 0) {
    doc.fillColor('#333333').fontSize(10).font('Helvetica').text(line, { lineGap: 2 })
  } else {
    doc.moveDown(0.2)
  }
})

// Page numbering
const pages = doc.bufferedPageRange()
for (let i = 0; i < pages.count; i++) {
  doc.switchToPage(i)
  doc.fillColor('#888888').fontSize(8).font('Helvetica').text(`Page ${i + 1} of ${pages.count}  |  HELIX Confidential Enterprise Sales Manual`, 40, doc.page.height - 30, {
    align: 'center',
  })
}

doc.end()

stream.on('finish', () => {
  console.log(`PDF successfully generated at: ${pdfPath}`)
})
