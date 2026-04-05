/**
 * Parse QR code string in format: ITEMCODE|PACKQTY
 * @param {string} qrString - Raw QR code data
 * @returns {{ itemCode: string, packQty: number }}
 */
const parseQR = (qrString) => {
  if (!qrString || typeof qrString !== 'string') {
    throw new Error('Invalid QR code data');
  }

  const parts = qrString.split('|');

  if (parts.length !== 2) {
    throw new Error('QR code format must be ITEMCODE|PACKQTY');
  }

  const itemCode = parts[0].trim();
  const packQty = Number(parts[1].trim());

  if (!itemCode) {
    throw new Error('Item code is missing in QR data');
  }

  if (isNaN(packQty) || packQty <= 0) {
    throw new Error('Pack quantity must be a positive number');
  }

  return { itemCode, packQty };
};

module.exports = { parseQR };
