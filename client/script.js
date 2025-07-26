// <!--
//   FILE: client/script.js (CORRECTED)
// -->
document.addEventListener("DOMContentLoaded", () => {
  // --- CONFIGURATION ---
  // THIS IS THE CRITICAL FIX. This URL must point to your live Render backend.
  const API_URL = "https://nyaya-mitra-api.onrender.com/api";

  // --- PAGE DETECTION ---
  const caseForm = document.getElementById("case-form");
  const casesTableBody = document.getElementById("cases-table-body");

  if (caseForm) {
    initializeFormPage();
  }

  if (casesTableBody) {
    initializeDashboardPage();
  }

  // --- INDEX PAGE LOGIC ----
  function initializeFormPage() {
    const submitButton = document.getElementById("submit-button");
    const formMessage = document.getElementById("form-message");

    caseForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      submitButton.disabled = true;
      submitButton.innerHTML = `<span class="spinner"></span> Submitting...`;
      formMessage.textContent = "";

      const formData = {
        caseTitle: document.getElementById("caseTitle").value,
        partiesInvolved: document.getElementById("partiesInvolved").value,
        caseDescription: document.getElementById("caseDescription").value,
      };

      try {
        const response = await fetch(`${API_URL}/cases`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || `HTTP error! Status: ${response.status}`
          );
        }

        formMessage.textContent =
          "Case submitted successfully! You can view it on the dashboard.";
        formMessage.className = "mt-4 text-center text-green-600 font-semibold";
        caseForm.reset();
      } catch (error) {
        formMessage.textContent = `Error: ${error.message}`;
        formMessage.className = "mt-4 text-center text-red-600 font-semibold";
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = "Submit Case";
      }
    });
  }

  // --- DASHBOARD PAGE LOGIC ---
  function initializeDashboardPage() {
    const modal = document.getElementById("case-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalBody = document.getElementById("modal-body");
    const modalCloseButton = document.getElementById("modal-close-button");
    const modalGenerateButton = document.getElementById(
      "modal-generate-button"
    );

    const loadCases = async () => {
      try {
        casesTableBody.innerHTML =
          '<tr><td colspan="5" class="text-center p-8 text-gray-500">Loading cases...</td></tr>';
        const response = await fetch(`${API_URL}/cases`);
        if (!response.ok) throw new Error("Failed to fetch cases.");

        const cases = await response.json();

        if (cases.length === 0) {
          casesTableBody.innerHTML =
            '<tr><td colspan="5" class="text-center p-8 text-gray-500">No cases have been submitted yet.</td></tr>';
          return;
        }

        casesTableBody.innerHTML = "";
        cases.forEach((caseItem) => {
          const row = document.createElement("tr");
          row.className = "border-b border-gray-200 hover:bg-gray-100";

          const statusColor =
            caseItem.status === "Analysis Complete"
              ? "bg-green-200 text-green-800"
              : "bg-yellow-200 text-yellow-800";

          row.innerHTML = `
                        <td class="px-5 py-5 text-sm"><p class="text-gray-900 whitespace-no-wrap">${
                          caseItem.caseTitle
                        }</p></td>
                        <td class="px-5 py-5 text-sm"><p class="text-gray-900 whitespace-no-wrap">${
                          caseItem.partiesInvolved
                        }</p></td>
                        <td class="px-5 py-5 text-sm"><p class="text-gray-900 whitespace-no-wrap">${new Date(
                          caseItem.submittedAt
                        ).toLocaleDateString()}</p></td>
                        <td class="px-5 py-5 text-sm"><span class="relative inline-block px-3 py-1 font-semibold leading-tight ${statusColor} rounded-full"><span class="relative">${
            caseItem.status
          }</span></span></td>
                        <td class="px-5 py-5 text-sm text-right">
                            <button data-id="${
                              caseItem._id
                            }" class="view-details-button bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">View Details</button>
                        </td>
                    `;
          casesTableBody.appendChild(row);
        });
      } catch (error) {
        casesTableBody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-red-500">Error loading cases: ${error.message}</td></tr>`;
      }
    };

    const openModal = async (caseId) => {
      try {
        const response = await fetch(`${API_URL}/cases`);
        if (!response.ok) throw new Error("Could not fetch case details.");
        const cases = await response.json();
        const caseItem = cases.find((c) => c._id === caseId);
        if (!caseItem) throw new Error("Case not found.");

        modalTitle.textContent = caseItem.caseTitle;

        let judgmentHTML = "";
        if (caseItem.status === "Analysis Complete") {
          judgmentHTML = `<div class="judgment-text">${caseItem.judgment}</div>`;
          modalGenerateButton.classList.add("hidden");
        } else {
          judgmentHTML = `<p class="text-gray-600">The AI judgment for this case has not been generated yet.</p>`;
          modalGenerateButton.classList.remove("hidden");
          modalGenerateButton.dataset.id = caseItem._id;
        }

        modalBody.innerHTML = `
                    <h3 class="font-bold text-lg mb-2 text-gray-800">Parties Involved</h3>
                    <p class="mb-4 text-gray-600">${caseItem.partiesInvolved}</p>
                    <h3 class="font-bold text-lg mb-2 text-gray-800">Case Description</h3>
                    <p class="mb-4 text-gray-600">${caseItem.caseDescription}</p>
                    <h3 class="font-bold text-lg mb-2 text-gray-800">AI Generated Judgment</h3>
                    <div id="judgment-container">${judgmentHTML}</div>
                `;
        modal.classList.remove("hidden");
      } catch (error) {
        modalBody.innerHTML = `<p class="text-red-500">Error loading case details: ${error.message}</p>`;
        modal.classList.remove("hidden");
      }
    };

    casesTableBody.addEventListener("click", (e) => {
      if (e.target.classList.contains("view-details-button")) {
        const caseId = e.target.dataset.id;
        openModal(caseId);
      }
    });

    modalCloseButton.addEventListener("click", () => {
      modal.classList.add("hidden");
    });

    modalGenerateButton.addEventListener("click", async (e) => {
      const caseId = e.target.dataset.id;

      e.target.disabled = true;
      e.target.innerHTML = `<span class="spinner"></span> Generating...`;

      try {
        const response = await fetch(
          `${API_URL}/cases/${caseId}/generate-judgment`,
          {
            method: "POST",
          }
        );

        if (!response.ok)
          throw new Error("Failed to generate judgment from server.");

        const updatedCase = await response.json();

        const judgmentContainer = document.getElementById("judgment-container");
        judgmentContainer.innerHTML = `<div class="judgment-text">${updatedCase.judgment}</div>`;
        e.target.classList.add("hidden");

        loadCases();
      } catch (error) {
        const judgmentContainer = document.getElementById("judgment-container");
        judgmentContainer.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
      } finally {
        e.target.disabled = false;
        e.target.innerHTML = "Generate AI Judgment";
      }
    });

    loadCases();
  }
});
