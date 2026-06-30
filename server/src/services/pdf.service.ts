import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { env } from '../config/env';

export const CERTIFICATES_DIR = path.join(process.cwd(), 'certificates');
fs.mkdirSync(CERTIFICATES_DIR, { recursive: true });

export interface TitleCertificateData {
  title_no: string;
  volume: string | null;
  folio: string | null;
  division: string;
  parcel: {
    plot_no: string | null;
    block_no: string | null;
    sub_division: string | null;
    situation: string | null;
    area_sqm: string | null;
  };
  owner: {
    full_name: string;
    ancestors: string | null;
    birth_place: string | null;
  };
  issued_at: Date;
}

// Generates the "Copie du Titre Foncier" certificate, embeds a QR code that
// resolves to the public verification page, and saves it to CERTIFICATES_DIR.
export async function generateTitleCertificatePdf(data: TitleCertificateData): Promise<string> {
  const verifyUrl = `${env.publicAppUrl}/verify?title_no=${encodeURIComponent(data.title_no)}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 });
  const qrImage = Buffer.from(qrDataUrl.split(',')[1] ?? '', 'base64');

  const filename = `${data.title_no.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
  const filePath = path.join(CERTIFICATES_DIR, filename);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.font('Helvetica-Bold').fontSize(16).text('RÉPUBLIQUE DU CAMEROUN', { align: 'center' });
  doc.font('Helvetica').fontSize(10).text('Paix - Travail - Patrie', { align: 'center' });
  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(14).text('CONSERVATION FONCIÈRE', { align: 'center' });
  doc.fontSize(12).text('COPIE DU TITRE FONCIER', { align: 'center' });
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke();
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(12).text(`N° ${data.title_no}`);
  doc.font('Helvetica').fontSize(11);
  doc.text(`Division: ${data.division}`);
  doc.text(`Volume: ${data.volume ?? '—'}    Folio: ${data.folio ?? '—'}`);
  doc.moveDown(1);

  doc.font('Helvetica-Bold').text('Désignation de la Parcelle');
  doc.font('Helvetica');
  doc.text(`Lot N°: ${data.parcel.plot_no ?? '—'}    Bloc: ${data.parcel.block_no ?? '—'}`);
  doc.text(`Lieu-dit: ${data.parcel.situation ?? '—'}`);
  doc.text(`Sous-division: ${data.parcel.sub_division ?? '—'}`);
  doc.text(`Superficie: ${data.parcel.area_sqm ?? '—'} m²`);
  doc.moveDown(1);

  doc.font('Helvetica-Bold').text('Titulaire du Titre');
  doc.font('Helvetica');
  doc.text(`Nom: ${data.owner.full_name}`);
  if (data.owner.ancestors) doc.text(`Fils/Fille de: ${data.owner.ancestors}`);
  if (data.owner.birth_place) doc.text(`Né(e) à: ${data.owner.birth_place}`);
  doc.moveDown(1);

  doc.text(
    `Date de délivrance: ${data.issued_at.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })}`,
  );

  const pageHeight = doc.page.height;
  doc.image(qrImage, 50, pageHeight - 150, { width: 100, height: 100 });
  doc.fontSize(7).text('Scannez pour vérifier', 50, pageHeight - 45, { width: 100, align: 'center' });

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return filePath;
}
