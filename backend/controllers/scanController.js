const Item = require('../models/Item');
const { emitToUser } = require('../utils/socketManager');

const processScan = async (req, res, next) => {
  try {
    const { qrData, action } = req.body;

    if (!qrData || typeof qrData !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'qrData is required (format: ITEMCODE|PACKQTY)',
      });
    }

    const parts = qrData.trim().split('|');

    if (parts.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR format. Expected: ITEMCODE|PACKQTY',
      });
    }

    const itemCode = parts[0].trim().toUpperCase();
    const packQty = parseInt(parts[1], 10);

    if (isNaN(packQty) || packQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pack quantity in QR data',
      });
    }

    const item = await Item.findOne({ itemCode });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Item not found: ${itemCode}`,
      });
    }

    // ✅ FINAL PAYLOAD (MATCH FRONTEND)
    const payload = {
      itemCode: item.itemCode,
      itemName: item.itemName,
      qty: packQty,
      action: action || 'IN',
      scannedBy: req.user.name,
      scannedAt: new Date().toISOString(),
    };

    // ✅ REAL-TIME EMIT
    emitToUser(req.user._id.toString(), 'qr_scanned', payload);

    return res.status(200).json({
      success: true,
      message: 'Scan processed successfully',
      data: payload,
    });

  } catch (error) {
    next(error);
  }
};

module.exports = { processScan };