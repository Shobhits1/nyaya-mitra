/*
 * -------------------------------------------------------------------------
 * FILE: server/index.js (FINAL DEBUGGING VERSION)
 * DESCRIPTION: This version opens up CORS completely to diagnose the
 * connection issue. This is for debugging only.
 * -------------------------------------------------------------------------
 */

// Import necessary packages
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Import the Case model
const Case = require("./models/case");

// --- INITIALIZATION ---
const app = express();
const PORT = process.env.PORT || 5000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- MIDDLEWARE ---

// Simple CORS configuration - allow all origins for now
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Successfully connected to MongoDB Atlas!"))
  .catch((error) => console.error("Error connecting to MongoDB:", error));

// --- API ROUTES ---

/**
 * @route   GET /api/test
 * @desc    Test endpoint to verify CORS is working
 * @access  Public
 */
app.get("/api/test", (req, res) => {
  res.status(200).json({ 
    message: "API is working!", 
    timestamp: new Date().toISOString(),
    origin: req.headers.origin 
  });
});

/**
 * @route   POST /api/cases
 * @desc    Create a new case and save it to the database
 * @access  Public
 */
app.post("/api/cases", async (req, res) => {
  try {
    const newCase = new Case({
      caseTitle: req.body.caseTitle,
      caseDescription: req.body.caseDescription,
      partiesInvolved: req.body.partiesInvolved,
    });
    const savedCase = await newCase.save();
    res.status(201).json(savedCase);
    console.log("New case submitted:", savedCase.caseTitle);
  } catch (error) {
    console.error("Error creating case:", error);
    res
      .status(500)
      .json({ message: "Failed to create case.", error: error.message });
  }
});

/**
 * @route   GET /api/cases
 * @desc    Get all cases from the database
 * @access  Public
 */
app.get("/api/cases", async (req, res) => {
  try {
    const cases = await Case.find().sort({ submittedAt: -1 });
    res.status(200).json(cases);
  } catch (error) {
    console.error("Error fetching cases:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch cases.", error: error.message });
  }
});

/**
 * @route   POST /api/cases/:id/generate-judgment
 * @desc    Generate a judgment for a specific case using the Gemini API
 * @access  Public
 */
app.post("/api/cases/:id/generate-judgment", async (req, res) => {
  try {
    const caseId = req.params.id;
    const caseToJudge = await Case.findById(caseId);

    if (!caseToJudge) {
      return res.status(404).json({ message: "Case not found." });
    }

    const caseDetails = `Case Title: ${caseToJudge.caseTitle}, Parties: ${caseToJudge.partiesInvolved}, Description: ${caseToJudge.caseDescription}`;
    const prompt = `
      As an AI legal analyst named "Nyaya Mitra," provide a preliminary, non-binding judgment for the following case based on the laws of India. Your analysis must be structured into four distinct sections:
      1.  **Factual Summary:** Briefly summarize the key facts of the case.
      2.  **Key Legal Issues:** Identify the primary legal questions that need to be addressed.
      3.  **Legal Analysis & Precedents:** Analyze the issues based on relevant sections of Indian law (e.g., IPC, CrPC, Contract Act). You may cite fictional case precedents for illustrative purposes.
      4.  **Suggested Conclusion:** Based on the analysis, suggest a logical and fair outcome.

      Begin your entire response with this mandatory disclaimer: "Disclaimer: This is an AI-generated analysis and does not constitute legal advice. It is for academic and illustrative purposes only."

      Case Details:
      ${caseDetails}
    `;

    console.log(`Generating judgment for case: ${caseToJudge.caseTitle}`);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiJudgment = response.text();

    caseToJudge.judgment = aiJudgment;
    caseToJudge.status = "Analysis Complete";
    const updatedCase = await caseToJudge.save();

    console.log(
      `Judgment generated successfully for case: ${updatedCase.caseTitle}`
    );
    res.status(200).json(updatedCase);
  } catch (error) {
    console.error("Error generating judgment:", error);
    await Case.findByIdAndUpdate(req.params.id, { status: "Error" });
    res
      .status(500)
      .json({ message: "Failed to generate judgment.", error: error.message });
  }
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Nyaya Mitra server is running on http://localhost:${PORT}`);
});
