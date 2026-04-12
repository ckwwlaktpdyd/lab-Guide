const fs = require('fs');
const files = [
  'active_workflow.html', 'preparation_guide.html', 'manufacturer_home.html',
  'client_progress.html', 'client_issues.html', 'client_results.html',
  'client_data.html', 'client_equipment.html', 'client_schedule.html',
  'batch_summary.html'
];

const patch = `
  /* P0: Respect reduced-motion preference (WCAG / ui-ux-pro-max critical) */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
</style>`;

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let html = fs.readFileSync(f, 'utf8');
  if (html.includes('prefers-reduced-motion')) {
    console.log(f + ': already patched');
    return;
  }
  // Replace LAST occurrence of </style>
  const idx = html.lastIndexOf('</style>');
  if (idx === -1) { console.log(f + ': no </style> found'); return; }
  html = html.substring(0, idx) + patch + html.substring(idx + '</style>'.length);
  fs.writeFileSync(f, html);
  console.log(f + ': ✅ patched');
});
