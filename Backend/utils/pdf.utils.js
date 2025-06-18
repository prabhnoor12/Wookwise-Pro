import PDFDocument from 'pdfkit';
import fs from 'fs';

// Generate a simple PDF invoice and save to file
export function generateInvoicePdf({ invoiceNumber, clientName, items, total, outputPath }) {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(outputPath));

    doc.fontSize(20).text('Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice #: ${invoiceNumber}`);
    doc.text(`Client: ${clientName}`);
    doc.moveDown();

    doc.text('Items:');
    items.forEach((item, idx) => {
        doc.text(`${idx + 1}. ${item.description} - $${item.amount.toFixed(2)}`);
    });

    doc.moveDown();
    doc.fontSize(14).text(`Total: $${total.toFixed(2)}`, { align: 'right' });

    doc.end();
}

// Generate a PDF buffer (for sending as email attachment)
export function generatePdfBuffer({ title, content }) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        doc.fontSize(18).text(title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(content);

        doc.end();
    });
}

// Generate a PDF invoice and return as buffer (for S3/email, no file write)
export function generateInvoicePdfBuffer({ invoiceNumber, clientName, items, total }) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        doc.fontSize(20).text('Invoice', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Invoice #: ${invoiceNumber}`);
        doc.text(`Client: ${clientName}`);
        doc.moveDown();

        doc.text('Items:');
        items.forEach((item, idx) => {
            doc.text(`${idx + 1}. ${item.description} - $${item.amount.toFixed(2)}`);
        });

        doc.moveDown();
        doc.fontSize(14).text(`Total: $${total.toFixed(2)}`, { align: 'right' });

        doc.end();
    });
}

// ...add more PDF utility functions as needed...
