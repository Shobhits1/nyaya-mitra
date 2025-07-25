/*
 * -------------------------------------------------------------------------
 * FILE: server/models/Case.js
 * DESCRIPTION: This file defines the Mongoose schema for a "Case".
 * A schema is a blueprint that defines the structure of documents
 * within a MongoDB collection. It specifies the fields, their types,
 * and any validation rules.
 * -------------------------------------------------------------------------
 */

const mongoose = require("mongoose");

// Define the structure of a case document
const caseSchema = new mongoose.Schema({
  caseTitle: {
    type: String,
    required: [true, "Case title is required."], // This field must be provided
    trim: true, // Removes whitespace from both ends of the string
  },
  caseDescription: {
    type: String,
    required: [true, "Case description is required."],
  },
  partiesInvolved: {
    type: String,
    required: [true, "Parties involved are required."],
    trim: true,
  },
  judgment: {
    type: String,
    default: "Pending AI Analysis", // Default value when a new case is created
  },
  status: {
    type: String,
    default: "Submitted", // Default status
    enum: ["Submitted", "Analysis Complete", "Error"], // The status can only be one of these values
  },
  submittedAt: {
    type: Date,
    default: Date.now, // Automatically sets the submission date and time
  },
});

// Create a Mongoose model from the schema.
// A model is a constructor compiled from a schema definition.
// An instance of a model is a document that can be saved to the database.
const Case = mongoose.model("Case", caseSchema);

// Export the model to be used in other parts of the application (like index.js)
module.exports = Case;
