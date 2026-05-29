import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { User, Transaction, CurrencyCode, OtpMethod } from "./types.js";

const MONGO_URI = process.env.MONGODB_URI || "";
const IS_MONGO = !!MONGO_URI;

// Persistent JSON file fallback path
const FALLBACK_DB_PATH = path.resolve(process.cwd(), "adrie_db.json");

// Connection state trackers
let mongoConnectionFailed = false;

// Dynamic state flag for the frontend context
export const getDatabaseMode = () => {
  if (!IS_MONGO) {
    return "Local Secure Database Storage";
  }
  if (mongoConnectionFailed) {
    return "Local Secure Database Storage (Outage Fallback)";
  }
  return "Live Distributed Cluster (MongoDB)";
};

// ---------------- IN-MEMORY & JSON FALLBACK IMPL ----------------
export interface PendingSignup {
  _id: string;
  fullName: string;
  email: string;
  password?: string;
  phone: string;
  currency: CurrencyCode;
  accountNumber?: string;
  otp?: string;
  otpExpiry?: string;
  otpMethod?: string;
  isEmailVerified?: boolean;
  createdAt: string;
}

interface LocalDbSchema {
  users: User[];
  transactions: Transaction[];
  pendingSignups?: PendingSignup[];
}

function loadLocalDb(): LocalDbSchema {
  try {
    if (fs.existsSync(FALLBACK_DB_PATH)) {
      const data = fs.readFileSync(FALLBACK_DB_PATH, "utf8");
      const parsed = JSON.parse(data);
      if (!parsed.pendingSignups) {
        parsed.pendingSignups = [];
      }
      return parsed;
    }
  } catch (error) {
    console.error("Failed to read local database file, initializing empty:", error);
  }
  return { users: [], transactions: [], pendingSignups: [] };
}

function saveLocalDb(data: LocalDbSchema) {
  try {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to persist local database file:", error);
  }
}

// ---------------- MONGOOSE SCHEMAS & MODELS ----------------
let MongooseUserModel: any;
let MongooseTransactionModel: any;
let MongoosePendingSignupModel: any;

if (IS_MONGO) {
  try {
    // Disable command buffering so queries fail-fast if Atlas connection is unavailable
    mongoose.set("bufferCommands", false);

    // Connect with a fast 3-second server selection timeout
    mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
    }).then(() => {
      console.log("AdrieChartered: Successfully connected to Live MongoDB database!");
    }).catch(err => {
      console.warn("AdrieChartered: MongoDB Connection Error. Pivoting dynamically to local file sandbox storage.", err.message || err);
      mongoConnectionFailed = true;
    });

    // Handle connection exceptions dynamically
    mongoose.connection.on("error", err => {
      console.warn("AdrieChartered: Dynamic MongoDB error detected. Triggering local JSON fallback.", err.message || err);
      mongoConnectionFailed = true;
    });

    const userSchema = new mongoose.Schema({
      fullName: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      phone: { type: String, required: true },
      accountNumber: { type: String, required: true, unique: true },
      sortCode: { type: String, required: true },
      currency: { type: String, default: "GBP" },
      balance: { type: Number, default: 0 },
      isVerified: { type: Boolean, default: false },
      profilePhoto: { type: String },
      otp: { type: String },
      otpExpiry: { type: Date },
      otpMethod: { type: String },
      createdAt: { type: Date, default: Date.now },
    });

    const transactionSchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      type: { type: String, required: true }, // credit or debit
      amount: { type: Number, required: true },
      currency: { type: String, required: true },
      recipientName: { type: String },
      recipientAccount: { type: String },
      recipientSortCode: { type: String },
      recipientBank: { type: String },
      description: { type: String },
      reference: { type: String, required: true },
      balanceBefore: { type: Number, required: true },
      balanceAfter: { type: Number, required: true },
      createdAt: { type: Date, default: Date.now },
    });

    const pendingSignupSchema = new mongoose.Schema({
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      password: { type: String, required: true },
      phone: { type: String, required: true },
      currency: { type: String, default: "GBP" },
      accountNumber: { type: String },
      otp: { type: String },
      otpExpiry: { type: Date },
      otpMethod: { type: String },
      isEmailVerified: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    });

    MongooseUserModel = mongoose.models.User || mongoose.model("User", userSchema);
    MongooseTransactionModel = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
    MongoosePendingSignupModel = mongoose.models.PendingSignup || mongoose.model("PendingSignup", pendingSignupSchema);
  } catch (err: any) {
    console.error("AdrieChartered: Schema Setup crash. Gracefully pivoting to fallback local database.", err.message || err);
    mongoConnectionFailed = true;
  }
}

// ---------------- UNIFIED DB LAYER METHODS ----------------

/** Maps a Mongoose user document to our API shape. Password only for auth lookups. */
function mapMongoUserDoc(mongoUser: any, options?: { includePassword?: boolean }): User & { password?: string } {
  const mapped: User & { password?: string } = {
    _id: mongoUser._id.toString(),
    fullName: mongoUser.fullName,
    email: mongoUser.email,
    phone: mongoUser.phone,
    accountNumber: mongoUser.accountNumber,
    sortCode: mongoUser.sortCode,
    currency: mongoUser.currency as CurrencyCode,
    balance: mongoUser.balance,
    isVerified: mongoUser.isVerified,
    profilePhoto: mongoUser.profilePhoto || undefined,
    otp: mongoUser.otp,
    otpExpiry: mongoUser.otpExpiry ? mongoUser.otpExpiry.toISOString() : undefined,
    otpMethod: mongoUser.otpMethod as OtpMethod,
    createdAt: mongoUser.createdAt.toISOString(),
  };
  if (options?.includePassword) {
    mapped.password = mongoUser.password;
  }
  return mapped;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const normEmail = email.toLowerCase().trim();
  if (IS_MONGO && MongooseUserModel && !mongoConnectionFailed) {
    try {
      const mongoUser = await MongooseUserModel.findOne({ email: normEmail });
      if (mongoUser) {
        return mapMongoUserDoc(mongoUser);
      }
      return null;
    } catch (err: any) {
      console.warn("AdrieChartered: (findUserByEmail) MongoDB lookup collapsed, fallback in-use:", err.message || err);
      if (err?.name === "MongooseServerSelectionError" || String(err?.message).toLowerCase().includes("selection") || String(err?.message).toLowerCase().includes("timeout")) {
        mongoConnectionFailed = true;
      }
    }
  }

  // Fallback branch
  const db = loadLocalDb();
  const user = db.users.find(u => u.email.toLowerCase().trim() === normEmail);
  return user || null;
}

export async function findUserByEmailOrAccountNumber(identifier: string): Promise<User | null> {
  const normInput = identifier.toLowerCase().trim();
  if (IS_MONGO && MongooseUserModel && !mongoConnectionFailed) {
    try {
      const mongoUser = await MongooseUserModel.findOne({
        $or: [
          { email: normInput },
          { accountNumber: normInput }
        ]
      });
      if (mongoUser) {
        return mapMongoUserDoc(mongoUser, { includePassword: true });
      }
      return null;
    } catch (err: any) {
      console.warn("AdrieChartered: (findUserByEmailOrAccountNumber) MongoDB lookup collapsed, fallback in-use:", err.message || err);
      if (err?.name === "MongooseServerSelectionError" || String(err?.message).toLowerCase().includes("selection") || String(err?.message).toLowerCase().includes("timeout")) {
        mongoConnectionFailed = true;
      }
    }
  }

  // Fallback branch
  const db = loadLocalDb();
  const trimmedInput = identifier.trim();
  const user = db.users.find(
    (u) =>
      u.email.toLowerCase().trim() === normInput ||
      u.accountNumber.trim() === trimmedInput
  );
  return user || null;
}

export async function findUserById(userId: string): Promise<User | null> {
  if (IS_MONGO && MongooseUserModel && !mongoConnectionFailed) {
    try {
      const mongoUser = await MongooseUserModel.findById(userId);
      if (mongoUser) {
        return {
          _id: mongoUser._id.toString(),
          fullName: mongoUser.fullName,
          email: mongoUser.email,
          phone: mongoUser.phone,
          accountNumber: mongoUser.accountNumber,
          sortCode: mongoUser.sortCode,
          currency: mongoUser.currency as CurrencyCode,
          balance: mongoUser.balance,
          isVerified: mongoUser.isVerified,
          otp: mongoUser.otp,
          otpExpiry: mongoUser.otpExpiry ? mongoUser.otpExpiry.toISOString() : undefined,
          otpMethod: mongoUser.otpMethod as OtpMethod,
          createdAt: mongoUser.createdAt.toISOString(),
        };
      }
      return null;
    } catch (err: any) {
      console.warn("AdrieChartered: (findUserById) MongoDB lookup collapsed, fallback in-use:", err.message || err);
      if (err?.name === "MongooseServerSelectionError" || String(err?.message).toLowerCase().includes("selection") || String(err?.message).toLowerCase().includes("timeout")) {
        mongoConnectionFailed = true;
      }
    }
  }

  // Fallback branch
  const db = loadLocalDb();
  const user = db.users.find(u => u._id === userId);
  return user || null;
}

export async function createUser(userData: Partial<User>): Promise<User> {
  if (IS_MONGO && MongooseUserModel && !mongoConnectionFailed) {
    try {
      const freshUser = new MongooseUserModel({
        fullName: userData.fullName,
        email: userData.email,
        password: (userData as any).password,
        phone: userData.phone,
        accountNumber: userData.accountNumber,
        sortCode: userData.sortCode,
        currency: userData.currency || "GBP",
        balance: userData.balance || 0,
        isVerified: userData.isVerified || false,
        otp: userData.otp,
        otpExpiry: userData.otpExpiry ? new Date(userData.otpExpiry) : undefined,
        otpMethod: userData.otpMethod,
      });

      const saved = await freshUser.save();
      return {
        _id: saved._id.toString(),
        fullName: saved.fullName,
        email: saved.email,
        phone: saved.phone,
        accountNumber: saved.accountNumber,
        sortCode: saved.sortCode,
        currency: saved.currency as CurrencyCode,
        balance: saved.balance,
        isVerified: saved.isVerified,
        otp: saved.otp,
        otpExpiry: saved.otpExpiry ? saved.otpExpiry.toISOString() : undefined,
        otpMethod: saved.otpMethod as OtpMethod,
        createdAt: saved.createdAt.toISOString(),
      };
    } catch (err: any) {
      console.warn("AdrieChartered: (createUser) MongoDB save collapsed, fallback in-use:", err.message || err);
      if (err?.name === "MongooseServerSelectionError" || String(err?.message).toLowerCase().includes("selection") || String(err?.message).toLowerCase().includes("timeout")) {
        mongoConnectionFailed = true;
      }
    }
  }

  // Fallback branch
  const db = loadLocalDb();
  const _id = Math.random().toString(36).substring(2, 11);
  const completedUser: User = {
    _id,
    fullName: userData.fullName || "",
    email: userData.email || "",
    phone: userData.phone || "",
    accountNumber: userData.accountNumber || "",
    sortCode: userData.sortCode || "",
    currency: (userData.currency || "GBP") as CurrencyCode,
    balance: userData.balance || 0,
    isVerified: userData.isVerified || false,
    otp: userData.otp,
    otpExpiry: userData.otpExpiry,
    otpMethod: userData.otpMethod,
    createdAt: new Date().toISOString(),
  };
  (completedUser as any).password = (userData as any).password;

  db.users.push(completedUser);
  saveLocalDb(db);
  return completedUser;
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  if (IS_MONGO && MongooseUserModel && !mongoConnectionFailed) {
    try {
      const mongoUpdates: any = { ...updates };
      if (updates.otpExpiry) {
        mongoUpdates.otpExpiry = new Date(updates.otpExpiry);
      }
      const updated = await MongooseUserModel.findByIdAndUpdate(
        userId,
        { $set: mongoUpdates },
        { new: true }
      );
      if (updated) {
        return {
          _id: updated._id.toString(),
          fullName: updated.fullName,
          email: updated.email,
          phone: updated.phone,
          accountNumber: updated.accountNumber,
          sortCode: updated.sortCode,
          currency: updated.currency as CurrencyCode,
          balance: updated.balance,
          isVerified: updated.isVerified,
          otp: updated.otp,
          otpExpiry: updated.otpExpiry ? updated.otpExpiry.toISOString() : undefined,
          otpMethod: updated.otpMethod as OtpMethod,
          createdAt: updated.createdAt.toISOString(),
        };
      }
      return null;
    } catch (err: any) {
      console.warn("AdrieChartered: (updateUser) MongoDB write collapsed, fallback in-use:", err.message || err);
      if (err?.name === "MongooseServerSelectionError" || String(err?.message).toLowerCase().includes("selection") || String(err?.message).toLowerCase().includes("timeout")) {
        mongoConnectionFailed = true;
      }
    }
  }

  // Fallback branch
  const db = loadLocalDb();
  const idx = db.users.findIndex(u => u._id === userId);
  if (idx === -1) return null;
  
  const current = db.users[idx];
  const updated = {
    ...current,
    ...updates,
  };
  if ((updates as any).password) {
    (updated as any).password = (updates as any).password;
  }
  db.users[idx] = updated;
  saveLocalDb(db);
  return updated;
}

export async function addTransaction(txData: Partial<Transaction>): Promise<Transaction> {
  if (IS_MONGO && MongooseTransactionModel && !mongoConnectionFailed) {
    try {
      const freshTx = new MongooseTransactionModel({
        userId: new mongoose.Types.ObjectId(txData.userId),
        type: txData.type,
        amount: txData.amount,
        currency: txData.currency,
        recipientName: txData.recipientName,
        recipientAccount: txData.recipientAccount,
        recipientSortCode: txData.recipientSortCode,
        recipientBank: txData.recipientBank,
        description: txData.description,
        reference: txData.reference,
        balanceBefore: txData.balanceBefore,
        balanceAfter: txData.balanceAfter,
      });
      const saved = await freshTx.save();
      return {
        _id: saved._id.toString(),
        userId: saved.userId.toString(),
        type: saved.type as "credit" | "debit",
        amount: saved.amount,
        currency: saved.currency as CurrencyCode,
        recipientName: saved.recipientName,
        recipientAccount: saved.recipientAccount,
        recipientSortCode: saved.recipientSortCode,
        recipientBank: saved.recipientBank,
        description: saved.description,
        reference: saved.reference,
        balanceBefore: saved.balanceBefore,
        balanceAfter: saved.balanceAfter,
        createdAt: saved.createdAt.toISOString(),
      };
    } catch (err: any) {
      console.warn("AdrieChartered: (addTransaction) MongoDB write collapsed, fallback in-use:", err.message || err);
      if (err?.name === "MongooseServerSelectionError" || String(err?.message).toLowerCase().includes("selection") || String(err?.message).toLowerCase().includes("timeout")) {
        mongoConnectionFailed = true;
      }
    }
  }

  // Fallback branch
  const db = loadLocalDb();
  const _id = Math.random().toString(36).substring(2, 11);
  const completedTx: Transaction = {
    _id,
    userId: txData.userId || "",
    type: (txData.type || "credit") as "credit" | "debit",
    amount: txData.amount || 0,
    currency: (txData.currency || "GBP") as CurrencyCode,
    recipientName: txData.recipientName,
    recipientAccount: txData.recipientAccount,
    recipientSortCode: txData.recipientSortCode,
    recipientBank: txData.recipientBank,
    description: txData.description || "",
    reference: txData.reference || "",
    balanceBefore: txData.balanceBefore || 0,
    balanceAfter: txData.balanceAfter || 0,
    createdAt: new Date().toISOString(),
  };
  db.transactions.push(completedTx);
  saveLocalDb(db);
  return completedTx;
}

export async function getTransactions(
  userId: string,
  options: {
    type?: "all" | "credit" | "debit";
    search?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ transactions: Transaction[]; total: number }> {
  const type = options.type || "all";
  const search = (options.search || "").toLowerCase().trim();
  const page = options.page || 1;
  const limit = options.limit || 10;

  if (IS_MONGO && MongooseTransactionModel && !mongoConnectionFailed) {
    try {
      const query: any = { userId: new mongoose.Types.ObjectId(userId) };
      if (type !== "all") {
        query.type = type;
      }
      if (search) {
        query.$or = [
          { recipientName: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { reference: { $regex: search, $options: "i" } },
          { recipientBank: { $regex: search, $options: "i" } },
        ];
      }
      
      const count = await MongooseTransactionModel.countDocuments(query);
      const results = await MongooseTransactionModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const transactions = results.map((saved: any) => ({
        _id: saved._id.toString(),
        userId: saved.userId.toString(),
        type: saved.type as "credit" | "debit",
        amount: saved.amount,
        currency: saved.currency as CurrencyCode,
        recipientName: saved.recipientName,
        recipientAccount: saved.recipientAccount,
        recipientSortCode: saved.recipientSortCode,
        recipientBank: saved.recipientBank,
        description: saved.description,
        reference: saved.reference,
        balanceBefore: saved.balanceBefore,
        balanceAfter: saved.balanceAfter,
        createdAt: saved.createdAt.toISOString(),
      }));

      return { transactions, total: count };
    } catch (err: any) {
      console.warn("AdrieChartered: (getTransactions) MongoDB lookup collapsed, fallback in-use:", err.message || err);
      if (err?.name === "MongooseServerSelectionError" || String(err?.message).toLowerCase().includes("selection") || String(err?.message).toLowerCase().includes("timeout")) {
        mongoConnectionFailed = true;
      }
    }
  }

  // Fallback branch
  const db = loadLocalDb();
  let filtered = db.transactions.filter(tx => tx.userId === userId);

  if (type !== "all") {
    filtered = filtered.filter(tx => tx.type === type);
  }

  if (search) {
    filtered = filtered.filter(tx => {
      const nameMatch = tx.recipientName ? tx.recipientName.toLowerCase().includes(search) : false;
      const bankMatch = tx.recipientBank ? tx.recipientBank.toLowerCase().includes(search) : false;
      const descMatch = tx.description ? tx.description.toLowerCase().includes(search) : false;
      const refMatch = tx.reference ? tx.reference.toLowerCase().includes(search) : false;
      return nameMatch || bankMatch || descMatch || refMatch;
    });
  }

  // Sort descending by date
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  return { transactions: paginated, total };
}

// ---------------- PENDING SIGNUPS HANDLERS ----------------

function mapPendingSignupDoc(doc: any): PendingSignup {
  return {
    _id: doc._id.toString(),
    fullName: doc.fullName,
    email: doc.email,
    password: doc.password,
    phone: doc.phone,
    currency: doc.currency as CurrencyCode,
    accountNumber: doc.accountNumber,
    otp: doc.otp,
    otpExpiry: doc.otpExpiry ? doc.otpExpiry.toISOString() : undefined,
    otpMethod: doc.otpMethod,
    isEmailVerified: doc.isEmailVerified,
    createdAt: doc.createdAt.toISOString(),
  };
}

/** All onboarding records (including applicants who have not finished OTP yet). */
export async function getAllPendingSignups(): Promise<PendingSignup[]> {
  if (IS_MONGO && MongoosePendingSignupModel && !mongoConnectionFailed) {
    try {
      const docs = await MongoosePendingSignupModel.find({}).sort({ createdAt: -1 });
      return docs.map(mapPendingSignupDoc);
    } catch (err: any) {
      console.warn("MongoDB pending signup fetch failed, fallback in-use:", err.message);
    }
  }

  const db = loadLocalDb();
  return db.pendingSignups || [];
}

/** Applicants who completed OTP and are ready for superintendent approval. */
export async function getPendingSignups(): Promise<PendingSignup[]> {
  const all = await getAllPendingSignups();
  return all.filter((p) => p.isEmailVerified === true);
}

export async function findPendingSignupByAccountNumber(accountNumber: string): Promise<PendingSignup | null> {
  const normAcct = accountNumber.trim();
  if (IS_MONGO && MongoosePendingSignupModel && !mongoConnectionFailed) {
    try {
      const doc = await MongoosePendingSignupModel.findOne({ accountNumber: normAcct });
      if (doc) {
        return {
          _id: doc._id.toString(),
          fullName: doc.fullName,
          email: doc.email,
          password: doc.password,
          phone: doc.phone,
          currency: doc.currency as CurrencyCode,
          accountNumber: doc.accountNumber,
          otp: doc.otp,
          otpExpiry: doc.otpExpiry ? doc.otpExpiry.toISOString() : undefined,
          otpMethod: doc.otpMethod,
          isEmailVerified: doc.isEmailVerified,
          createdAt: doc.createdAt.toISOString(),
        };
      }
      return null;
    } catch (err: any) {
      console.warn("MongoDB pending signup lookup by account number failed, fallback in-use:", err.message);
    }
  }

  const db = loadLocalDb();
  if (!db.pendingSignups) return null;
  const found = db.pendingSignups.find((u) => u.accountNumber?.trim() === normAcct);
  return found || null;
}

export async function createPendingSignup(data: Partial<PendingSignup>): Promise<PendingSignup> {
  const normEmail = (data.email || "").toLowerCase().trim();
  
  if (IS_MONGO && MongoosePendingSignupModel && !mongoConnectionFailed) {
    try {
      const doc = new MongoosePendingSignupModel({
        fullName: data.fullName,
        email: normEmail,
        password: data.password,
        phone: data.phone,
        currency: data.currency || "GBP",
        accountNumber: data.accountNumber,
        isEmailVerified: false,
      });
      const saved = await doc.save();
      return {
        _id: saved._id.toString(),
        fullName: saved.fullName,
        email: saved.email,
        password: saved.password,
        phone: saved.phone,
        currency: saved.currency as CurrencyCode,
        accountNumber: saved.accountNumber,
        otp: saved.otp,
        otpExpiry: saved.otpExpiry ? saved.otpExpiry.toISOString() : undefined,
        otpMethod: saved.otpMethod,
        isEmailVerified: saved.isEmailVerified,
        createdAt: saved.createdAt.toISOString(),
      };
    } catch (err: any) {
      console.warn("MongoDB pending signup save failed, fallback in-use:", err.message);
    }
  }

  const db = loadLocalDb();
  const _id = "pend_" + Math.random().toString(36).substring(2, 11);
  const completed: PendingSignup = {
    _id,
    fullName: data.fullName || "",
    email: normEmail,
    password: data.password || "",
    phone: data.phone || "",
    currency: (data.currency || "GBP") as CurrencyCode,
    accountNumber: data.accountNumber,
    isEmailVerified: false,
    createdAt: new Date().toISOString(),
  };

  if (!db.pendingSignups) {
    db.pendingSignups = [];
  }
  db.pendingSignups.push(completed);
  saveLocalDb(db);
  return completed;
}

export async function deletePendingSignup(id: string): Promise<boolean> {
  if (IS_MONGO && MongoosePendingSignupModel && !mongoConnectionFailed) {
    try {
      await MongoosePendingSignupModel.findByIdAndDelete(id);
      return true;
    } catch (err: any) {
      console.warn("MongoDB pending signup deletion failed, fallback in-use:", err.message);
    }
  }

  const db = loadLocalDb();
  if (!db.pendingSignups) return false;
  const initialLen = db.pendingSignups.length;
  db.pendingSignups = db.pendingSignups.filter(u => u._id !== id);
  saveLocalDb(db);
  return db.pendingSignups.length < initialLen;
}

export async function findPendingSignupByEmail(email: string): Promise<PendingSignup | null> {
  const normEmail = email.toLowerCase().trim();
  if (IS_MONGO && MongoosePendingSignupModel && !mongoConnectionFailed) {
    try {
      const doc = await MongoosePendingSignupModel.findOne({ email: normEmail });
      if (doc) {
        return {
          _id: doc._id.toString(),
          fullName: doc.fullName,
          email: doc.email,
          password: doc.password,
          phone: doc.phone,
          currency: doc.currency as CurrencyCode,
          accountNumber: doc.accountNumber,
          otp: doc.otp,
          otpExpiry: doc.otpExpiry ? doc.otpExpiry.toISOString() : undefined,
          otpMethod: doc.otpMethod,
          isEmailVerified: doc.isEmailVerified,
          createdAt: doc.createdAt.toISOString(),
        };
      }
      return null;
    } catch (err: any) {
      console.warn("MongoDB pending signup lookup by email failed, fallback in-use:", err.message);
    }
  }

  const db = loadLocalDb();
  if (!db.pendingSignups) return null;
  const found = db.pendingSignups.find(u => u.email.toLowerCase().trim() === normEmail);
  return found || null;
}

export async function findPendingSignupById(id: string): Promise<PendingSignup | null> {
  if (IS_MONGO && MongoosePendingSignupModel && !mongoConnectionFailed) {
    try {
      const doc = await MongoosePendingSignupModel.findById(id);
      if (doc) {
        return {
          _id: doc._id.toString(),
          fullName: doc.fullName,
          email: doc.email,
          password: doc.password,
          phone: doc.phone,
          currency: doc.currency as CurrencyCode,
          accountNumber: doc.accountNumber,
          otp: doc.otp,
          otpExpiry: doc.otpExpiry ? doc.otpExpiry.toISOString() : undefined,
          otpMethod: doc.otpMethod,
          isEmailVerified: doc.isEmailVerified,
          createdAt: doc.createdAt.toISOString(),
        };
      }
      return null;
    } catch (err: any) {
      console.warn("MongoDB pending signup lookup by ID failed, fallback in-use:", err.message);
    }
  }

  const db = loadLocalDb();
  if (!db.pendingSignups) return null;
  const found = db.pendingSignups.find(u => u._id === id);
  return found || null;
}

export async function updatePendingSignup(id: string, updates: Partial<PendingSignup>): Promise<PendingSignup | null> {
  if (IS_MONGO && MongoosePendingSignupModel && !mongoConnectionFailed) {
    try {
      const mongoUpdates: any = { ...updates };
      if (updates.otpExpiry) {
        mongoUpdates.otpExpiry = new Date(updates.otpExpiry);
      }
      const updated = await MongoosePendingSignupModel.findByIdAndUpdate(
        id,
        { $set: mongoUpdates },
        { new: true }
      );
      if (updated) {
        return {
          _id: updated._id.toString(),
          fullName: updated.fullName,
          email: updated.email,
          password: updated.password,
          phone: updated.phone,
          currency: updated.currency as CurrencyCode,
          accountNumber: updated.accountNumber,
          otp: updated.otp,
          otpExpiry: updated.otpExpiry ? updated.otpExpiry.toISOString() : undefined,
          otpMethod: updated.otpMethod,
          isEmailVerified: updated.isEmailVerified,
          createdAt: updated.createdAt.toISOString(),
        };
      }
      return null;
    } catch (err: any) {
      console.warn("MongoDB pending signup update failed, fallback in-use:", err.message);
    }
  }

  const db = loadLocalDb();
  if (!db.pendingSignups) return null;
  const idx = db.pendingSignups.findIndex(u => u._id === id);
  if (idx === -1) return null;

  const current = db.pendingSignups[idx];
  const updated = {
    ...current,
    ...updates,
  };
  db.pendingSignups[idx] = updated;
  saveLocalDb(db);
  return updated;
}
