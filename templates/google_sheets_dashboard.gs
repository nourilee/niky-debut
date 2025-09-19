function initDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var formSheet = ss.getSheetByName('Form Responses 1');
  if (!formSheet) throw new Error("Sheet 'Form Responses 1' not found. Link your Google Form first.");

  var dash = ss.getSheetByName('Dashboard');
  if (!dash) {
    dash = ss.insertSheet('Dashboard');
  } else {
    dash.clear();
  }

  // Titles
  dash.getRange('A1').setValue('Counts').setFontWeight('bold');
  dash.getRange('A2').setValue('Yes Count');
  dash.getRange('A3').setValue('No Count');
  dash.getRange('A4').setValue('Total Responses');

  dash.getRange('B2').setFormula("=COUNTIF('Form Responses 1'!D2:D, \"Yes\")");
  dash.getRange('B3').setFormula("=COUNTIF('Form Responses 1'!D2:D, \"No\")");
  dash.getRange('B4').setFormula("=COUNTA('Form Responses 1'!A2:A)");

  // Attending lists
  dash.getRange('A6').setValue('Attending (Names)').setFontWeight('bold');
  dash.getRange('A7').setFormula("=IFERROR(SORT(FILTER('Form Responses 1'!B2:B, 'Form Responses 1'!D2:D=\"Yes\"), 1, TRUE), \"\")");

  dash.getRange('A10').setValue('Not Attending (Names)').setFontWeight('bold');
  dash.getRange('A11').setFormula("=IFERROR(SORT(FILTER('Form Responses 1'!B2:B, 'Form Responses 1'!D2:D=\"No\"), 1, TRUE), \"\")");

  // Latest responses table
  dash.getRange('E1').setValue('Latest Responses').setFontWeight('bold');
  dash.getRange('E2').setValue('Timestamp').setFontWeight('bold');
  dash.getRange('F2').setValue('Name').setFontWeight('bold');
  dash.getRange('G2').setValue('Email').setFontWeight('bold');
  dash.getRange('H2').setValue('Will attend?').setFontWeight('bold');
  // Sort by Timestamp desc
  dash.getRange('E3').setFormula("=IFERROR(SORT('Form Responses 1'!A2:D, 1, FALSE), \"\")");

  // Formatting
  dash.setFrozenRows(2);
  dash.autoResizeColumns(1, 8);
}

