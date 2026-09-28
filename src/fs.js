/* Virtual filesystem for Frank's computer */
(() => {
  const N = [];
  const F = (id, parent, name, extra = {}) => N.push({ id, parent, name, type: 'folder', app: 'explorer', icon: 'folder', ...extra });
  const f = (id, parent, name, app, icon, size, modified, extra = {}) =>
    N.push({ id, parent, name, type: 'file', app, icon, size, modified, author: 'Frank Warmington', ...extra });

  // Top level
  F('desktop', null, 'Desktop', { icon: 'desktop' });
  F('mycomputer', null, 'My Computer', { icon: 'computer' });
  F('cdrive', 'mycomputer', 'Local Disk (C:)', { icon: 'drive' });
  F('ddrive', 'mycomputer', 'DVD Drive (D:)', { icon: 'cdrom', empty: 'Please insert a disc into drive D:.' });
  F('pdrive', 'mycomputer', 'finance on \'PACKA-FS01\' (P:)', { icon: 'network', empty: 'P:\\ is not accessible.\n\nThe network path was not found.\n\n(The file server is also in Vegas.)' });
  F('docset', 'cdrive', 'Documents and Settings');
  F('progfiles', 'cdrive', 'Program Files', { locked: 'These files are hidden. This folder contains files that keep your system working properly. You should not modify its contents.' });
  F('windows', 'cdrive', 'WINDOWS', { locked: 'These files are hidden. This folder contains files that keep your system working properly. You should not modify its contents.' });
  F('frankhome', 'docset', 'Frank Warmington');
  F('mydocs', 'frankhome', 'My Documents', { icon: 'mydocs' });
  F('recycle', null, 'Recycle Bin', { icon: 'recycleFull', app: 'recycle' });

  // My Documents
  F('budget', 'mydocs', 'FY27 Budget');
  F('board', 'mydocs', 'Board Meeting Oct 20');
  F('boardroot', 'mydocs', 'BOARD');
  F('boardver', 'boardroot', 'BOARD VERSION');
  F('bank', 'mydocs', 'Bank');
  F('cashdir', 'boardroot', 'REAL VERSION', { hidden: true, icon: 'folderHidden' });
  F('personal', 'mydocs', 'Personal');
  F('pics', 'mydocs', 'My Pictures', { icon: 'folder' });

  // FY27 Budget
  f('bud_v3', 'budget', 'Budget_FY27_v3.xls', 'excel', 'xls', '61 KB', '09/14/2026 4:12 PM');
  f('bud_v4', 'budget', 'Budget_FY27_v4_FINAL.xls', 'excel', 'xls', '63 KB', '09/21/2026 9:40 AM');
  f('bud_v5ff', 'budget', 'Budget_FY27_v5_FINAL_FINAL.xls', 'excel', 'xls', '64 KB', '10/02/2026 6:55 PM');
  f('bud_v5ut', 'budget', 'Budget_FY27_v5_FINAL_USE_THIS.xls', 'excel', 'xls', '64 KB', '10/05/2026 11:58 PM');
  f('bud_v6', 'budget', 'Budget_FY27_v6_DK_comments.xls', 'excel', 'xls', '66 KB', '10/04/2026 2:20 PM', { author: 'Diane Kessler' });
  f('bud_board', 'budget', 'Budget_FY27_BOARD.xls', 'excel', 'xlsLocked', '71 KB', '10/16/2026 3:04 AM', { title: 'FY27 Budget - Board copy', comments: 'Protected' });
  f('bud_lock', 'budget', '~$Budget_FY27_v5_FINAL_USE_THIS.xls', 'notepad', 'xls', '1 KB', '10/05/2026 11:58 PM', { hidden: true });
  f('bud_readme', 'budget', 'which_one_is_final.txt', 'notepad', 'txt', '1 KB', '10/05/2026 11:31 PM', { author: 'Joshua Reyes' });

  // Board Meeting
  f('bridge', 'board', 'Q3_EBITDA_Bridge.xls', 'excel', 'xls', '48 KB', '10/06/2026 1:12 AM');
  f('agenda', 'board', 'Board_Agenda_Oct20.txt', 'notepad', 'txt', '3 KB', '10/13/2026 10:05 AM', { author: 'Diane Kessler' });
  f('packlist', 'board', 'what_the_bank_wants.txt', 'notepad', 'txt', '1 KB', '10/14/2026 8:47 AM');
  f('inv_diecutter', 'board', 'DieCutter_Rebuild_Invoice_4471.pdf', 'pdf', 'txt', '96 KB', '09/25/2026 3:41 PM', { author: 'Karen Wills', comments: 'paid by wire 09/25. NOT financed. —K' });

  // Bank
  f('bankzip', 'bank', 'Bank.zip', 'zip', 'zip', '212 KB', '10/05/2026 7:30 PM', { password: '3130' });
  f('loan', 'bankzip', 'Loan_Agreement_Excerpt.txt', 'notepad', 'txt', '9 KB', '06/01/2026 10:00 AM', { author: 'Prairie Ledger Bank', title: 'Credit Agreement (conformed copy)', comments: 'Amended and restated through June 1, 2026. Read 6.1 slowly. —F' });
  f('covenant', 'bankzip', 'Covenant_Cert_Q3.xls', 'excel', 'xls', '39 KB', '10/05/2026 7:22 PM');

  // BOARD VERSION (what Drew takes to the Board)
  f('bp_q1', 'boardver', 'Packa_Board_Pack_Q1_2026_FINAL.xls', 'excel', 'xls', '41 KB', '01/20/2026 5:02 PM');
  f('bp_q2', 'boardver', 'Packa_Board_Pack_Q2_2026_FINAL.xls', 'excel', 'xls', '41 KB', '04/21/2026 4:48 PM');
  f('bp_q3', 'boardver', 'Packa_Board_Pack_Q3_2026_FINAL.xls', 'excel', 'xls', '43 KB', '07/21/2026 6:15 PM');
  f('bp_q4', 'boardver', 'Packa_Board_Pack_Q4_2026_FINAL.xls', 'excel', 'xls', '44 KB', '10/14/2026 7:31 PM', { author: 'Drew Hollis' });
  // REAL VERSION (hidden)
  f('cash13', 'cashdir', 'Packa_Cash_13wk_REAL_2026-10-16.xls', 'excel', 'xls', '55 KB', '10/16/2026 10:48 PM');
  f('changelog', 'cashdir', 'CHANGE_LOG_do_not_share.xls', 'excel', 'xls', '29 KB', '10/16/2026 11:38 PM');
  f('realnotes', 'cashdir', 'NOTES_to_whoever_finds_this.txt', 'notepad', 'txt', '1 KB', '10/16/2026 11:40 PM');
  f('cashnote', 'cashdir', 'dont_show_drew.txt', 'notepad', 'txt', '1 KB', '10/16/2026 10:51 PM');

  // Desktop items
  F('forboard_dir', 'desktop', 'FOR THE BOARD');
  f('forboardx', 'forboard_dir', 'FOR_THE_BOARD.xls', 'excel', 'xlsLocked', '88 KB', '10/16/2026 11:52 PM', { title: 'Emergency plan', comments: 'Protected' });
  F('fanclub', 'desktop', 'Kristians Fan Club');
  f('pic_k_signed', 'fanclub', 'SIGNED_kristians_riga_2025.jpg', 'image', 'image', '1.1 MB', '11/14/2025 9:41 PM');
  f('pic_k_me', 'fanclub', 'me_and_kristians_(photoshop).jpg', 'image', 'image', '860 KB', '02/02/2026 1:12 AM');
  f('pic_k_card', 'fanclub', 'fan_club_card_member_0003.jpg', 'image', 'image', '310 KB', '03/03/2026 3:03 PM');
  f('pic_k_poster', 'fanclub', 'MASTER_OF_CHEAT_SHEETS_poster.jpg', 'image', 'image', '2.3 MB', '06/18/2026 8:12 PM');
  f('pic_k_cal', 'fanclub', 'cheat_sheet_calendar_OCTOBER.jpg', 'image', 'image', '1.7 MB', '10/01/2026 7:02 AM');
  f('pic_k_mug', 'fanclub', 'kristians_mug_(drew_do_not_use).jpg', 'image', 'image', '980 KB', '09/09/2026 12:12 PM');
  f('k_webinar', 'fanclub', 'webinar_notes_LAMBDA_night.txt', 'notepad', 'txt', '2 KB', '09/24/2026 10:58 PM');
  f('k_ranked', 'fanclub', 'Kristians_cheat_sheets_RANKED.xls', 'excel', 'xls', '33 KB', '10/11/2026 12:44 AM');
  F('newfolder3', 'desktop', 'New Folder (3)');
  f('copybudget', 'desktop', 'Copy of Copy (2) of Budget_FY27_v2.xls', 'excel', 'xls', '58 KB', '09/03/2026 8:15 AM');
  f('drewhat', 'desktop', 'drew_hat_evidence.jpg', 'image', 'image', '640 KB', '10/07/2026 12:31 PM');
  f('passwords', 'desktop', 'passwords.txt', 'notepad', 'txt', '1 KB', '10/16/2026 11:57 PM');
  f('model47', 'desktop', 'Packa_Corp_Model_FY26_v47_FINAL_FINAL_use_this_one.xls', 'excel', 'xls', '4.7 MB', '10/16/2026 9:20 PM');

  // Personal
  f('esports', 'personal', 'speedrun_practice.xls', 'excel', 'xls', '22 KB', '10/03/2026 1:15 AM');
  f('todo', 'personal', 'todo.txt', 'notepad', 'txt', '1 KB', '10/16/2026 11:02 PM');
  f('rachelcard', 'personal', 'card_from_rachel.txt', 'notepad', 'txt', '1 KB', '10/14/2026 4:44 PM', { author: 'Rachel Moss' });

  // Pictures
  f('pic_poster', 'pics', 'my_cheat_sheet_poster.jpg', 'image', 'image', '1.2 MB', '09/02/2026 3:03 PM');
  f('pic_team', 'pics', 'fpa_team_bbq_2025.jpg', 'image', 'image', '2.4 MB', '07/04/2025 6:20 PM');
  f('pic_kristians', 'pics', 'kristians_CHEAT_SHEET_SUMMIT_2026.jpg', 'image', 'image', '1.4 MB', '10/11/2026 1:03 AM');
  f('pic_plant', 'pics', 'plant_floor.jpg', 'image', 'image', '1.9 MB', '05/02/2026 9:12 AM');

  // Outlook Express attachment store (not browsable in Explorer; opened from Rachel's "I KNEW IT" email)
  F('mailatt', null, 'Attachments', { hidden: true, system: true });
  f('pic_evidence', 'mailatt', 'vegas_evidence.jpg', 'image', 'image', '620 KB', '10/18/2026 11:26 PM', { author: 'Rachel Moss' });

  // Recycle Bin
  f('del_demo', 'recycle', 'Re_ FinanceOS walkthrough_.eml', 'mail', 'eml', '14 KB', '10/02/2026 9:01 AM', { origin: 'C:\\Documents and Settings\\Frank Warmington\\My Documents' });
  f('boarding', 'recycle', 'boarding_pass.txt', 'notepad', 'txt', '1 KB', '10/16/2026 11:58 PM', { origin: 'C:\\Documents and Settings\\Frank Warmington\\Desktop' });
  f('bud_v2', 'recycle', 'Budget_FY27_v2.xls', 'excel', 'xls', '58 KB', '09/10/2026 5:30 PM', { origin: 'C:\\Documents and Settings\\Frank Warmington\\My Documents\\FY27 Budget' });

  const byId = {};
  N.forEach(n => (byId[n.id] = n));

  window.FR = window.FR || {};
  FR.data = FR.data || { texts: {} };
  FR.fs = {
    nodes: N,
    get: id => (typeof id === 'string' ? byId[id] : id),
    children(id, opts = {}) {
      const showHidden = opts.showHidden ?? (FR.flags && FR.flags.get('showHidden'));
      return N.filter(n => n.parent === id && (showHidden || !n.hidden));
    },
    path(id) {
      const parts = [];
      let n = byId[id];
      while (n) {
        if (n.id === 'mycomputer') break;
        if (n.id === 'cdrive') { parts.unshift('C:'); break; }
        if (n.id === 'desktop' || n.id === 'recycle') { parts.unshift(n.name); break; }
        parts.unshift(n.name);
        n = byId[n.parent];
      }
      return parts.join('\\') + (parts.length === 1 && parts[0] === 'C:' ? '\\' : '');
    },
  };
})();
