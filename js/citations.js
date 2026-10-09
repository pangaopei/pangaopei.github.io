(() => {
  document.querySelectorAll('.citation-tools').forEach(panel => {
    panel.querySelector('.citation-actions').hidden = false;
    panel.querySelectorAll('[data-citation-value]').forEach(value => { value.hidden = true; });
    panel.querySelectorAll('[data-copy-citation]').forEach(button => {
      button.addEventListener('click', async () => {
        const format = button.dataset.copyCitation;
        const value = panel.querySelector(`[data-citation-value="${format}"]`);
        const status = panel.querySelector('.citation-status');
        try {
          await navigator.clipboard.writeText(value.textContent.trim());
          status.textContent = format === 'bibtex' ? 'BibTeX copied.' : 'PPT citation copied.';
        } catch {
          panel.querySelectorAll('[data-citation-value]').forEach(item => { item.hidden = item !== value; });
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(value);
          selection.removeAllRanges();
          selection.addRange(range);
          status.textContent = 'Select and copy the citation below (Ctrl+C / ⌘C).';
        }
      });
    });
  });
})();
