const SupplierOrder = require('../Models/supplierOrderModel');

// ── Create PO ──────────────────────────────────────────────────────────────────
exports.createSupplierOrder = async (req, res) => {
  try {
    const {
      supplierName, supplierContact, supplierEmail, supplierPhone,
      supplierAddress, items, shippingCost, requiredDeliveryDate,
      shippingMethod, shippingAccount, notes, status
    } = req.body;

    if (!supplierName) return res.status(400).json({ message: 'Supplier name is required' });
    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: 'At least one line item is required' });

    const order = new SupplierOrder({
      supplierName, supplierContact, supplierEmail, supplierPhone,
      supplierAddress, items, shippingCost: shippingCost || 0,
      requiredDeliveryDate, shippingMethod, shippingAccount,
      notes, status: status || 'draft',
      createdBy: req.user._id
    });

    await order.save();
    res.status(201).json({ success: true, message: 'Purchase order created', order });
  } catch (error) {
    console.error('[SupplierOrder] create error:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// ── Get all POs ────────────────────────────────────────────────────────────────
exports.getSupplierOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search = '' } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { poNumber:     { $regex: esc, $options: 'i' } },
        { supplierName: { $regex: esc, $options: 'i' } }
      ];
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await SupplierOrder.countDocuments(query);
    const orders = await SupplierOrder
      .find(query)
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      orders,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Get single PO ──────────────────────────────────────────────────────────────
exports.getSupplierOrder = async (req, res) => {
  try {
    const order = await SupplierOrder
      .findById(req.params.id)
      .populate('createdBy', 'name role')
      .lean();
    if (!order) return res.status(404).json({ message: 'Purchase order not found' });
    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Update PO ──────────────────────────────────────────────────────────────────
exports.updateSupplierOrder = async (req, res) => {
  try {
    const {
      supplierName, supplierContact, supplierEmail, supplierPhone,
      supplierAddress, items, shippingCost, requiredDeliveryDate,
      shippingMethod, shippingAccount, notes, status
    } = req.body;

    const order = await SupplierOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Purchase order not found' });
    if (order.status === 'received')
      return res.status(400).json({ message: 'Cannot edit a received order' });

    if (supplierName)         order.supplierName         = supplierName;
    if (supplierContact  != null) order.supplierContact  = supplierContact;
    if (supplierEmail    != null) order.supplierEmail     = supplierEmail;
    if (supplierPhone    != null) order.supplierPhone     = supplierPhone;
    if (supplierAddress  != null) order.supplierAddress   = supplierAddress;
    if (items && items.length)    order.items             = items;
    if (shippingCost     != null) order.shippingCost      = shippingCost;
    if (requiredDeliveryDate)     order.requiredDeliveryDate = requiredDeliveryDate;
    if (shippingMethod   != null) order.shippingMethod    = shippingMethod;
    if (shippingAccount  != null) order.shippingAccount   = shippingAccount;
    if (notes            != null) order.notes             = notes;
    if (status)                   order.status            = status;

    await order.save();
    res.status(200).json({ success: true, message: 'Purchase order updated', order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ── Update status only ─────────────────────────────────────────────────────────
exports.updateSupplierOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['draft', 'sent', 'confirmed', 'received', 'cancelled'];
    if (!allowed.includes(status))
      return res.status(400).json({ message: 'Invalid status value' });

    const order = await SupplierOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ message: 'Purchase order not found' });
    res.status(200).json({ success: true, message: 'Status updated', order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ── Delete PO ──────────────────────────────────────────────────────────────────
exports.deleteSupplierOrder = async (req, res) => {
  try {
    const order = await SupplierOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Purchase order not found' });
    if (order.status === 'received')
      return res.status(400).json({ message: 'Cannot delete a received order' });

    await SupplierOrder.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Purchase order deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
