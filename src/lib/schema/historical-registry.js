(function (global, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.Form5500HistoricalRegistry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createField(definition, instructionsYear) {
    return {
      ...definition,
      locationRef: {
        ...definition.locationRef,
        instructionsYear
      }
    };
  }

  const baseFields = [
    {
      fieldId: "planName",
      name: "planName",
      headerLabel: "planName",
      dataType: "text",
      locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 1a", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 1
    },
    {
      fieldId: "planNumber",
      name: "planNumber",
      headerLabel: "planNumber",
      dataType: "code",
      locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 1b", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 2
    },
    {
      fieldId: "sponsorEmployerIdentificationNumber",
      name: "sponsorEmployerIdentificationNumber",
      headerLabel: "sponsorEmployerIdentificationNumber",
      dataType: "code",
      locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 2b", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 3
    },
    {
      fieldId: "planYearBeginDate",
      name: "planYearBeginDate",
      headerLabel: "planYearBeginDate",
      dataType: "date",
      locationRef: { form: "Form 5500", schedule: null, part: "Part I", line: "Line B", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 4
    },
    {
      fieldId: "planYearEndDate",
      name: "planYearEndDate",
      headerLabel: "planYearEndDate",
      dataType: "date",
      locationRef: { form: "Form 5500", schedule: null, part: "Part I", line: "Line B", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 5
    },
    {
      fieldId: "sponsorName",
      name: "sponsorName",
      headerLabel: "sponsorName",
      dataType: "text",
      locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 2a", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 20
    },
    {
      fieldId: "sponsorAddress",
      name: "sponsorAddress",
      headerLabel: "sponsorAddress",
      dataType: "text",
      locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 2d", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 21
    },
    {
      fieldId: "businessCode",
      name: "businessCode",
      headerLabel: "businessCode",
      dataType: "code",
      locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 2e", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 22
    },
    {
      fieldId: "participantCountBeginningOfYear",
      name: "participantCountBeginningOfYear",
      headerLabel: "participantCountBeginningOfYear",
      dataType: "integer",
      locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 6a", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 30
    },
    {
      fieldId: "retiredParticipantsReceivingBenefits",
      name: "retiredParticipantsReceivingBenefits",
      headerLabel: "retiredParticipantsReceivingBenefits",
      dataType: "integer",
      locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 6d", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 31
    },
    {
      fieldId: "separatedParticipantsEntitledToBenefits",
      name: "separatedParticipantsEntitledToBenefits",
      headerLabel: "separatedParticipantsEntitledToBenefits",
      dataType: "integer",
      locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 6e", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 32
    },
    {
      fieldId: "deceasedParticipantsBeneficiaries",
      name: "deceasedParticipantsBeneficiaries",
      headerLabel: "deceasedParticipantsBeneficiaries",
      dataType: "integer",
      locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 6f", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 33
    },
    {
      fieldId: "participantCountTotal",
      name: "participantCountTotal",
      headerLabel: "participantCountTotal",
      dataType: "integer",
      locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 6g", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 34
    },
    {
      fieldId: "assetsBeginningOfYear",
      name: "assetsBeginningOfYear",
      headerLabel: "assetsBeginningOfYear",
      dataType: "currency",
      locationRef: { form: "Form 5500", schedule: "H", part: "Part I", line: "Line 1a", instructionsYear: 2024 },
      supportedSchedules: ["H", "I"],
      exportGroup: "allYears",
      exportOrder: 40
    },
    {
      fieldId: "assetsEndOfYear",
      name: "assetsEndOfYear",
      headerLabel: "assetsEndOfYear",
      dataType: "currency",
      locationRef: { form: "Form 5500", schedule: "H", part: "Part I", line: "Line 1b", instructionsYear: 2024 },
      supportedSchedules: ["H", "I"],
      exportGroup: "allYears",
      exportOrder: 41
    },
    {
      fieldId: "liabilitiesBeginningOfYear",
      name: "liabilitiesBeginningOfYear",
      headerLabel: "liabilitiesBeginningOfYear",
      dataType: "currency",
      locationRef: { form: "Form 5500", schedule: "H", part: "Part I", line: "Line 2a", instructionsYear: 2024 },
      supportedSchedules: ["H", "I"],
      exportGroup: "allYears",
      exportOrder: 42
    },
    {
      fieldId: "liabilitiesEndOfYear",
      name: "liabilitiesEndOfYear",
      headerLabel: "liabilitiesEndOfYear",
      dataType: "currency",
      locationRef: { form: "Form 5500", schedule: "H", part: "Part I", line: "Line 2b", instructionsYear: 2024 },
      supportedSchedules: ["H", "I"],
      exportGroup: "allYears",
      exportOrder: 43
    },
    {
      fieldId: "netAssetsBeginningOfYear",
      name: "netAssetsBeginningOfYear",
      headerLabel: "netAssetsBeginningOfYear",
      dataType: "currency",
      locationRef: { form: "Form 5500", schedule: "H", part: "Part I", line: "Line 3a", instructionsYear: 2024 },
      supportedSchedules: ["H", "I"],
      exportGroup: "allYears",
      exportOrder: 44
    },
    {
      fieldId: "netAssetsEndOfYear",
      name: "netAssetsEndOfYear",
      headerLabel: "netAssetsEndOfYear",
      dataType: "currency",
      locationRef: { form: "Form 5500", schedule: "H", part: "Part I", line: "Line 3b", instructionsYear: 2024 },
      supportedSchedules: ["H", "I"],
      exportGroup: "allYears",
      exportOrder: 45
    },
    {
      fieldId: "scheduleHAccountantOpinion",
      name: "scheduleHAccountantOpinion",
      headerLabel: "scheduleHAccountantOpinion",
      dataType: "text",
      locationRef: { form: "Form 5500", schedule: "H", part: "Part IV", line: "Line 3a", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 46
    },
    {
      fieldId: "fundingTargetAttainmentPercent",
      name: "fundingTargetAttainmentPercent",
      headerLabel: "fundingTargetAttainmentPercent",
      dataType: "percent",
      locationRef: { form: "Form 5500", schedule: "SB", part: "Part I", line: "Line 27", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 47
    },
    {
      fieldId: "planEffectiveDate",
      name: "planEffectiveDate",
      headerLabel: "planEffectiveDate",
      dataType: "date",
      locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 1c", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 48
    },
    {
      fieldId: "sponsorTelephoneNumber",
      name: "sponsorTelephoneNumber",
      headerLabel: "sponsorTelephoneNumber",
      dataType: "text",
      locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 2c", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 49
    },
    {
      fieldId: "planAdministratorSameAsSponsor",
      name: "planAdministratorSameAsSponsor",
      headerLabel: "planAdministratorSameAsSponsor",
      dataType: "boolean",
      locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 3a", instructionsYear: 2024 },
      exportGroup: "allYears",
      exportOrder: 50
    },
    {
      fieldId: "insuranceInForce",
      name: "insuranceInForce",
      headerLabel: "insuranceInForce",
      dataType: "boolean",
      locationRef: { form: "Form 5500", schedule: "A", part: "Part I", line: "Line 1", instructionsYear: 2024 },
      supportedSchedules: ["A"],
      exportGroup: "allYears",
      exportOrder: 60
    },
    {
      fieldId: "serviceProviderCompensationIndirect",
      name: "serviceProviderCompensationIndirect",
      headerLabel: "serviceProviderCompensationIndirect",
      dataType: "boolean",
      locationRef: { form: "Form 5500", schedule: "C", part: "Part I", line: "Line 2", instructionsYear: 2024 },
      supportedSchedules: ["C"],
      exportGroup: "allYears",
      exportOrder: 61
    },
    {
      fieldId: "reportableTransactionsPresent",
      name: "reportableTransactionsPresent",
      headerLabel: "reportableTransactionsPresent",
      dataType: "boolean",
      locationRef: { form: "Form 5500", schedule: "G", part: "Part III", line: "Line 1", instructionsYear: 2024 },
      supportedSchedules: ["G", "H"],
      exportGroup: "allYears",
      exportOrder: 62
    },
    {
      fieldId: "benefitsPaid",
      name: "benefitsPaid",
      headerLabel: "benefitsPaid",
      dataType: "currency",
      locationRef: { form: "Attachment", schedule: "H", part: "Financial Statements", line: "Benefits paid", instructionsYear: 2024 },
      supportedSchedules: ["H", "I"],
      exportGroup: "allYears",
      exportOrder: 70
    },
    {
      fieldId: "administrativeExpenses",
      name: "administrativeExpenses",
      headerLabel: "administrativeExpenses",
      dataType: "currency",
      locationRef: { form: "Attachment", schedule: "H", part: "Financial Statements", line: "Administrative expenses", instructionsYear: 2024 },
      supportedSchedules: ["H", "I"],
      exportGroup: "allYears",
      exportOrder: 71
    },
    {
      fieldId: "employerContributions",
      name: "employerContributions",
      headerLabel: "employerContributions",
      dataType: "currency",
      locationRef: { form: "Attachment", schedule: "H", part: "Financial Statements", line: "Employer contributions", instructionsYear: 2024 },
      supportedSchedules: ["H", "I"],
      exportGroup: "allYears",
      exportOrder: 72
    },
    {
      fieldId: "investmentIncome",
      name: "investmentIncome",
      headerLabel: "investmentIncome",
      dataType: "currency",
      locationRef: { form: "Attachment", schedule: "H", part: "Financial Statements", line: "Investment income", instructionsYear: 2024 },
      supportedSchedules: ["H", "I"],
      exportGroup: "allYears",
      exportOrder: 73
    },
    {
      fieldId: "netChangeInAssets",
      name: "netChangeInAssets",
      headerLabel: "netChangeInAssets",
      dataType: "currency",
      locationRef: { form: "Attachment", schedule: "H", part: "Financial Statements", line: "Net increase (decrease)", instructionsYear: 2024 },
      supportedSchedules: ["H", "I"],
      exportGroup: "allYears",
      exportOrder: 74
    },
    {
      fieldId: "actuarialPresentValueOfAccumulatedPlanBenefits",
      name: "actuarialPresentValueOfAccumulatedPlanBenefits",
      headerLabel: "actuarialPresentValueOfAccumulatedPlanBenefits",
      dataType: "currency",
      locationRef: { form: "Attachment", schedule: "SB", part: "Actuarial Attachment", line: "Accumulated plan benefits", instructionsYear: 2024 },
      supportedSchedules: ["SB", "MB"],
      exportGroup: "allYears",
      exportOrder: 75
    },
    {
      fieldId: "contributingEmployerCount",
      name: "contributingEmployerCount",
      headerLabel: "contributingEmployerCount",
      dataType: "integer",
      locationRef: { form: "Form 5500", schedule: "R", part: "Part V", line: "Line 13", instructionsYear: 2024 },
      supportedSchedules: ["R"],
      exportGroup: "allYears",
      exportOrder: 76
    },
    {
      fieldId: "inactiveParticipantCount",
      name: "inactiveParticipantCount",
      headerLabel: "inactiveParticipantCount",
      dataType: "integer",
      locationRef: { form: "Form 5500", schedule: "R", part: "Part V", line: "Line 14a", instructionsYear: 2024 },
      supportedSchedules: ["R"],
      exportGroup: "allYears",
      exportOrder: 77
    }
  ];

  function getHistoricalSchemaRegistry(filingYear) {
    const instructionsYear = Number(filingYear) || 2024;
    return baseFields.map((definition) => createField(definition, instructionsYear));
  }

  function getBaseSchemaRegistry() {
    return getHistoricalSchemaRegistry(2024);
  }

  return {
    getBaseSchemaRegistry,
    getHistoricalSchemaRegistry
  };
});
