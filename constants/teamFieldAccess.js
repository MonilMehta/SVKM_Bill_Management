// Field access control constants for team-based field updates
const teamFieldAccessControl = {
  "QS Team": [
    "copDetails.date",
    "copDetails.amount"
  ],
  "Site Team": [
    "migoDetails.number",
    "migoDetails.date",
    "migoDetails.amount"
  ],
  "PIMO & MIGO/SES Team": [
    "sesDetails.number",
    "sesDetails.amount",
    "sesDetails.date"
  ],
  "Accounts Team": [
    "accountsDept.f110Identification",
    "accountsDept.paymentDate",
    "accountsDept.hardCopy",
    "accountsDept.accountsIdentification",
    "accountsDept.paymentAmt",
    "miroDetails.number",
    "miroDetails.date",
    "miroDetails.amount"
  ]
};

// Map from user roles to teams
const roleToTeamMap = {
  "qs_site": "QS Team",
  "qs_mumbai": "QS Team",
  "site_officer": "Site Team",
  "site_engineer": "Site Team",
  "site_incharge": "Site Team",
  "site_architect": "Site Team",
  "pimo_mumbai": "PIMO & MIGO/SES Team",
  "site_pimo": "PIMO & MIGO/SES Team",
  "accounts": "Accounts Team",
  "admin": "admin" // Admin can update any field
};

// Map from frontend field names to database field names
const fieldNameMap = {
  // QS Team
  "COP Dt": "copDetails.date",
  "COP Amt": "copDetails.amount",
  
  // Site Team
  "MIGO no": "migoDetails.number",
  "MIGO Dt": "migoDetails.date",
  "MIGO Amt": "migoDetails.amount",
  
  // PIMO & MIGO/SES Team
  "SES no": "sesDetails.number",
  "SES Amt": "sesDetails.amount",
  "SES Dt": "sesDetails.date",
  
  // Accounts Team
  "F110 Identification": "accountsDept.f110Identification",
  "Dt of Payment": "accountsDept.paymentDate",
  "Hard Copy": "accountsDept.hardCopy",
  "Accts Identification": "accountsDept.accountsIdentification",
  "Payment Amt": "accountsDept.paymentAmt",
  "MIRO no": "miroDetails.number",
  "MIRO Dt": "miroDetails.date",
  "MIRO Amt": "miroDetails.amount"
};

export { teamFieldAccessControl, roleToTeamMap, fieldNameMap };
