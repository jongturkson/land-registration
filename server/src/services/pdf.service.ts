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
  nature: string | null;
  parcel: {
    plot_no: string | null;
    block_no: string | null;
    sub_division: string | null;
    situation: string | null;
    area_sqm: string | null;
    limit_north: string | null;
    limit_south: string | null;
    limit_east: string | null;
    limit_west: string | null;
  };
  owner: {
    full_name: string;
    ancestors: string | null;
    birth_place: string | null;
    birth_date: Date | null;
    marital_status: string | null;
    nationality: string | null;
  };
  issued_at: Date;
}

// Generates the "Copie du Titre Foncier" certificate, embeds a QR code that
// resolves to the public verification page, and saves it to CERTIFICATES_DIR.
export async function generateTitleCertificatePdf(data: TitleCertificateData): Promise<string> {
  const verifyParams = new URLSearchParams({ title_no: data.title_no });
  if (data.volume) verifyParams.set('volume', data.volume);
  if (data.folio) verifyParams.set('folio', data.folio);
  const verifyUrl = `${env.publicAppUrl}/verify?${verifyParams.toString()}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 });
  const qrImage = Buffer.from(qrDataUrl.split(',')[1] ?? '', 'base64');

  const filename = `${data.title_no.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
  const filePath = path.join(CERTIFICATES_DIR, filename);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const dash = '—';
  // Bilingual label/value line, matching the official certificate's FR / EN style
  const field = (fr: string, en: string, value: string | null | undefined): void => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#333');
    doc.text(`${fr}`, { continued: true });
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#777');
    doc.text(`  ${en}`);
    doc.font('Helvetica').fontSize(11).fillColor('#000').text(value && value.trim() ? value : dash);
    doc.moveDown(0.4);
  };

  const sectionHeader = (label: string): void => {
    doc.moveDown(0.6);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000').text(label);
    doc.moveTo(50, doc.y + 1).lineTo(545, doc.y + 1).lineWidth(0.5).strokeColor('#999').stroke();
    doc.moveDown(0.6);
  };

  // ── Letterhead ────────────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(14).text('RÉPUBLIQUE DU CAMEROUN', { align: 'center' });
  doc.font('Helvetica').fontSize(9).text('Paix - Travail - Patrie', { align: 'center' });
  doc.fontSize(8).fillColor('#555').text('REPUBLIC OF CAMEROON  •  Peace - Work - Fatherland', {
    align: 'center',
  });
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#000');
  doc.text(`CONSERVATION FONCIÈRE DE ${data.division.toUpperCase()}`, { align: 'center' });
  doc.font('Helvetica-Oblique').fontSize(8).fillColor('#777');
  doc.text(`Registry of Landed Property of ${data.division}`, { align: 'center' });
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#000').text('COPIE DU TITRE FONCIER', {
    align: 'center',
  });
  doc.font('Helvetica-Oblique').fontSize(9).fillColor('#777').text('Copy of Land Certificate', {
    align: 'center',
  });
  doc.moveDown(0.4);

  // ── Title identifiers ─────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#000');
  doc.text(`N° ${data.title_no}`, { align: 'center' });
  doc.font('Helvetica').fontSize(10);
  doc.text(`Volume: ${data.volume ?? dash}    Folio: ${data.folio ?? dash}`, { align: 'center' });
  doc.moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).lineWidth(1).strokeColor('#000').stroke();

  // ── Section I — Designation & description of the property ──────────────────
  sectionHeader('SECTION I — DÉSIGNATION ET DESCRIPTION DE L’IMMEUBLE');
  field('Nature et consistance de l’immeuble', 'Nature and consistency', data.nature);
  field('Contenance / Area', 'Surface area', data.parcel.area_sqm ? `${data.parcel.area_sqm} m²` : null);
  field(
    'Situation / Situation',
    'Plot / Block / Sub-division',
    [
      data.parcel.plot_no ? `Lot ${data.parcel.plot_no}` : null,
      data.parcel.block_no ? `Bloc ${data.parcel.block_no}` : null,
      data.parcel.sub_division,
      data.parcel.situation,
    ]
      .filter(Boolean)
      .join(', ') || null,
  );
  field(
    'Limites / Limits',
    'North · South · East · West',
    [
      data.parcel.limit_north ? `N: ${data.parcel.limit_north}` : null,
      data.parcel.limit_south ? `S: ${data.parcel.limit_south}` : null,
      data.parcel.limit_east ? `E: ${data.parcel.limit_east}` : null,
      data.parcel.limit_west ? `O: ${data.parcel.limit_west}` : null,
    ]
      .filter(Boolean)
      .join('   ') || null,
  );

  // ── Civil status of the owner ─────────────────────────────────────────────
  sectionHeader('ÉTAT CIVIL DU PROPRIÉTAIRE — Civil status of the owner');
  field('Noms et Prénoms', 'Full name', data.owner.full_name);
  field('Fils/Fille de (ascendants)', 'Name of ancestors', data.owner.ancestors);
  field(
    'Lieu et date de naissance',
    'Place and date of birth',
    [
      data.owner.birth_place,
      data.owner.birth_date
        ? data.owner.birth_date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        : null,
    ]
      .filter(Boolean)
      .join(', ') || null,
  );
  field('Nationalité / Situation de famille', 'Nationality / Marital status',
    [data.owner.nationality, data.owner.marital_status].filter(Boolean).join(' · ') || null);

  // ── Delivery & registrar attestation ──────────────────────────────────────
  sectionHeader('DÉLIVRANCE — Issue');
  doc.font('Helvetica').fontSize(10).fillColor('#000');
  doc.text(
    `Établi au livre foncier du département de ${data.division} et délivré le ${data.issued_at.toLocaleDateString(
      'fr-FR',
      { day: '2-digit', month: 'long', year: 'numeric' },
    )}.`,
  );
  doc.moveDown(1.5);
  doc.font('Helvetica-Bold').fontSize(10).text('Le Conservateur Foncier', { align: 'right' });
  doc.font('Helvetica-Oblique').fontSize(8).fillColor('#777').text('The Registrar of Land Property', {
    align: 'right',
  });

  // ── QR verification footer ────────────────────────────────────────────────
  const pageHeight = doc.page.height;
  doc.image(qrImage, 50, pageHeight - 150, { width: 100, height: 100 });
  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor('#555')
    .text('Scannez pour vérifier l’authenticité', 50, pageHeight - 45, {
      width: 100,
      align: 'center',
    });

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return filePath;
}
