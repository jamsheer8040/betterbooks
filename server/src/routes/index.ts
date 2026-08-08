import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { CustomerController } from '../controllers/customerController.js';
import { FilingController } from '../controllers/filingController.js';
import { InvoiceController } from '../controllers/invoiceController.js';
import { PaymentController } from '../controllers/paymentController.js';
import { FundController } from '../controllers/fundController.js';
import { LedgerController } from '../controllers/ledgerController.js';
import { WalletController } from '../controllers/walletController.js';
import { AgentController } from '../controllers/agentController.js';
import { CommissionController } from '../controllers/commissionController.js';
import { ProductController } from '../controllers/productController.js';
import { CompanyController } from '../controllers/companyController.js';
import { UserController } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { upload } from '../middleware/upload.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  return successResponse(res, { status: 'healthy', timestamp: new Date().toISOString() }, 'Better Books API is running');
});

// File Upload
router.post('/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) {
    return errorResponse(res, 'No file uploaded', 400);
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  return successResponse(res, {
    fileUrl,
    filename: req.file.filename,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  }, 'File uploaded successfully', 201);
});

// Auth Routes
const authRouter = Router();
authRouter.post('/login', AuthController.login);
authRouter.post('/register', AuthController.register);
authRouter.get('/me', authenticate, AuthController.me);
router.use('/auth', authRouter);

// Customer Routes
const customerRouter = Router();
customerRouter.use(authenticate);
customerRouter.get('/', CustomerController.list);
customerRouter.get('/:id', CustomerController.getById);
customerRouter.post('/', requirePermission('customers.create'), CustomerController.create);
customerRouter.put('/:id', requirePermission('customers.edit'), CustomerController.update);
customerRouter.delete('/:id', requirePermission('customers.delete'), CustomerController.delete);
customerRouter.post('/:id/documents', requirePermission('customers.edit'), CustomerController.addDocument);
customerRouter.delete('/:id/documents/:docId', requirePermission('customers.edit'), CustomerController.deleteDocument);
router.use('/customers', customerRouter);

// Filing Routes
const filingRouter = Router();
filingRouter.use(authenticate);
filingRouter.get('/', FilingController.list);
filingRouter.get('/matrix', FilingController.getTrackerMatrix);
filingRouter.post('/milestones', requirePermission('filings.edit'), FilingController.updateMilestone);
filingRouter.get('/:id', FilingController.getById);
filingRouter.post('/', requirePermission('filings.create'), FilingController.create);
filingRouter.put('/:id', requirePermission('filings.edit'), FilingController.update);
filingRouter.delete('/:id', requirePermission('filings.delete'), FilingController.delete);
router.use('/filings', filingRouter);

// Invoice Routes
const invoiceRouter = Router();
invoiceRouter.use(authenticate);
invoiceRouter.get('/', InvoiceController.list);
invoiceRouter.get('/:id', InvoiceController.getById);
invoiceRouter.post('/', requirePermission('invoices.create'), InvoiceController.create);
invoiceRouter.put('/:id', requirePermission('invoices.edit'), InvoiceController.update);
invoiceRouter.post('/:id/cancel', requirePermission('invoices.edit'), InvoiceController.cancel);
router.use('/invoices', invoiceRouter);

// Payment Routes
const paymentRouter = Router();
paymentRouter.use(authenticate);
paymentRouter.get('/', PaymentController.list);
paymentRouter.post('/', requirePermission('invoices.edit'), PaymentController.create);
router.use('/payments', paymentRouter);

// Fund Routes
const fundRouter = Router();
fundRouter.use(authenticate);
fundRouter.get('/', FundController.list);
fundRouter.post('/deposit', requirePermission('invoices.edit'), FundController.deposit);
fundRouter.get('/balance/:customer_id', FundController.getBalance);
router.use('/funds', fundRouter);

// Ledger Routes
const ledgerRouter = Router();
ledgerRouter.use(authenticate);
ledgerRouter.get('/', LedgerController.list);
ledgerRouter.get('/summary', LedgerController.getSummary);
router.use('/ledger', ledgerRouter);

// Wallet Routes
const walletRouter = Router();
walletRouter.use(authenticate);
walletRouter.get('/', WalletController.list);
walletRouter.get('/:id', WalletController.getById);
walletRouter.post('/', requirePermission('wallets.manage'), WalletController.create);
walletRouter.put('/:id', requirePermission('wallets.manage'), WalletController.update);
walletRouter.delete('/:id', requirePermission('wallets.manage'), WalletController.delete);
router.use('/wallets', walletRouter);

// Agent Routes
const agentRouter = Router();
agentRouter.use(authenticate);
agentRouter.get('/portal', AgentController.getPortalData);
agentRouter.get('/', AgentController.list);
agentRouter.get('/:id', AgentController.getById);
agentRouter.post('/', requirePermission('agents.manage'), AgentController.create);
agentRouter.put('/:id', requirePermission('agents.manage'), AgentController.update);
agentRouter.delete('/:id', requirePermission('agents.manage'), AgentController.delete);
router.use('/agents', agentRouter);

// Commission Routes
const commissionRouter = Router();
commissionRouter.use(authenticate);
commissionRouter.get('/', CommissionController.list);
commissionRouter.post('/', requirePermission('commissions.manage'), CommissionController.create);
commissionRouter.patch('/:id/status', requirePermission('commissions.manage'), CommissionController.updateStatus);
commissionRouter.delete('/:id', requirePermission('commissions.manage'), CommissionController.delete);
router.use('/commissions', commissionRouter);

// Product / Service Master Routes
const productRouter = Router();
productRouter.use(authenticate);
productRouter.get('/', ProductController.list);
productRouter.post('/', requirePermission('products.manage'), ProductController.create);
productRouter.put('/:id', requirePermission('products.manage'), ProductController.update);
productRouter.delete('/:id', requirePermission('products.manage'), ProductController.delete);
router.use('/products', productRouter);

// Company Settings Routes
const companyRouter = Router();
companyRouter.get('/settings', CompanyController.getSettings);
companyRouter.put('/settings', authenticate, requirePermission('company.manage'), CompanyController.updateSettings);
router.use('/company', companyRouter);

// User & Role Management Routes
const userRouter = Router();
userRouter.use(authenticate);
userRouter.get('/users', requirePermission('users.manage'), UserController.listUsers);
userRouter.post('/users', requirePermission('users.manage'), UserController.createUser);
userRouter.put('/users/:id', requirePermission('users.manage'), UserController.updateUser);
userRouter.delete('/users/:id', requirePermission('users.manage'), UserController.deleteUser);
userRouter.get('/types', UserController.listUserTypes);
userRouter.post('/types', requirePermission('users.manage'), UserController.createUserType);
userRouter.put('/types/:id', requirePermission('users.manage'), UserController.updateUserType);
userRouter.delete('/types/:id', requirePermission('users.manage'), UserController.deleteUserType);
router.use('/users-admin', userRouter);

export default router;
