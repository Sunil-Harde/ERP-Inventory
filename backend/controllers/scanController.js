const Item = require('../models/Item');
const { emitToUser } = require('../utils/socketManager');

/**
 * @desc    Process a QR scan and emit real-time event to the user's dashboard
 * @route   POST /api/v1/scan
 * @access  Private
 */
const processScan = async (req, res, next) => {
  try {
    const { qrData } = req.body;

    if (!qrData || typeof qrData !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'qrData is required (format: ITEMCODE|PACKQTY)',
      });
    }

    // Parse QR string: ITEMCODE|PACKQTY
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

    // Look up item
    const item = await Item.findOne({ itemCode });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Item not found: ${itemCode}`,
      });
    }

    // Emit real-time event only to this user's socket room
    const payload = {
      itemCode: item.itemCode,
      itemName: item.itemName,
      packQty,
      currentStock: item.stock,
      uom: item.uom,
      scannedBy: req.user.name,
      scannedAt: new Date().toISOString(),
    };

    emitToUser(req.user._id.toString(), 'qr_scanned', payload);

    return res.status(200).json({
      success: true,
      message: 'Scan received. Event sent to your dashboard.',
      data: payload,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { processScan };
