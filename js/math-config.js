window.MathJax = {
  startup: {
    pageReady() {
      return MathJax.startup.defaultPageReady().then(() => {
        const body = document.querySelector('.article-body');
        if (!body) return;
        const updateOverflow = () => {
          body.querySelectorAll('mjx-container').forEach(container => {
            const math = container.querySelector('mjx-math');
            let parent = container.parentElement;
            while (parent !== body && getComputedStyle(parent).display === 'inline') {
              parent = parent.parentElement;
            }
            const style = getComputedStyle(parent);
            const available = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            const tooWide = math && math.getBoundingClientRect().width > available + 1;
            container.classList.toggle('math-overflow', Boolean(tooWide));
          });
        };
        updateOverflow();
        new ResizeObserver(updateOverflow).observe(body);
      });
    }
  },
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true
  },
  options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] }
};
