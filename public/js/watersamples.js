(function ($) {
  let sampleList = $('#sample-list');
  let errorDiv = $('#error-div');
  let loadMoreBtn = $('#btn-load-more');
  let noMoreMsg = $('#no-more-data');
  let loadingMsg = $('#loading-msg');

  let currentPage = 0;
  let isLoading = false; // prevents duplicate concurrent requests

  function showError(msg) {
    errorDiv.text(msg).removeClass('hidden');
  }

  function hideError() {
    errorDiv.text('').addClass('hidden');
  }

  function textOrNA(v) {
    return v === null || v === undefined ? 'N/A' : String(v);
  }

  function val(v, unit) {
    if (v === null || v === undefined) return 'N/A';
    return unit ? String(v) + ' ' + unit : String(v);
  }

  function apiGet(url) {
    return $.ajax({ method: 'GET', url: url, cache: false });
  }

  function buildListItem(s) {
    const boroughText = s.borough ? `[${s.borough}] ` : '';
    const title = boroughText + textOrNA(s.sample_site) + ' (' + textOrNA(s.date) + ')';

    const li = $('<li></li>').addClass('ws-item');
    li.append($('<span></span>').addClass('ws-title').text(title));
    li.append($('<div></div>').addClass('ws-details').text(
      'Chlorine: ' + val(s.chlorine, 'mg/L') +
      ' | Turbidity: ' + val(s.turbidity, 'NTU') +
      ' | Fluoride: ' + val(s.fluoride, 'mg/L')
    ));
    li.append($('<div></div>').addClass('ws-details').text(
      'Coliform: ' + val(s.coliform) +
      ' | E.Coli: ' + val(s.ecoli) +
      ' | Sample #: ' + textOrNA(s.sample_number)
    ));

    return li;
  }

  function loadSamples() {
    if (isLoading) return;
    isLoading = true;

    hideError();
    noMoreMsg.addClass('hidden');
    loadingMsg.removeClass('hidden');
    loadMoreBtn.addClass('hidden');

    const nextPage = currentPage + 1;
    const url = '/api/water-samples?page=' + nextPage;

    apiGet(url)
      .then(data => {
        loadingMsg.addClass('hidden');
        const results = Array.isArray(data) ? data : [];

        if (results.length === 0) {
          if (currentPage === 0) showError('No water samples found.');
          else noMoreMsg.removeClass('hidden');
          isLoading = false;
          return;
        }

        results.forEach(sample => sampleList.append(buildListItem(sample)));
        currentPage = nextPage;
        loadMoreBtn.removeClass('hidden');
        isLoading = false;
      })
      .catch(() => {
        loadingMsg.addClass('hidden');
        showError('Failed to load data. Please try again later.');
        isLoading = false;
        loadMoreBtn.removeClass('hidden');
      });
  }

  loadMoreBtn.off('click').on('click', e => {
    e.preventDefault();
    loadSamples();
  });

  // initial load
  loadSamples();
})(window.jQuery);
