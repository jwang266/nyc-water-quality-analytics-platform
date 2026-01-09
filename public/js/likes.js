(function ($) {
  const likeButton = $('#like-button');
  const likeStatus = $('#like-status');

  // No like button on this page
  if (likeButton.length === 0) return;

  function setDisabled(v) {
    likeButton.prop('disabled', !!v);
  }

  function setText(isLiked) {
    likeStatus.text(isLiked ? 'Liked!' : 'Like This Borough');
  }

  // Toggle button style based on like state
  function setStyle(isLiked) {
    if (isLiked) {
      likeButton.removeClass('btn-outline').addClass('btn-danger');
    } else {
      likeButton.removeClass('btn-danger').addClass('btn-outline');
    }
  }

  function showError(msg) {
    alert('Error: ' + msg);
  }

  function apiPost(url) {
    return $.ajax({
      method: 'POST',
      url,
      contentType: 'application/json'
    });
  }

  function toggleLike() {
    const boroughId = likeButton.data('borough-id');
    if (!boroughId) {
      showError('Missing borough id.');
      return $.Deferred()
        .reject({ responseJSON: { error: 'Missing borough ID.' } })
        .promise();
    }
    return apiPost(`/boroughs/${boroughId}/like`);
  }

  likeButton.on('click', function (e) {
    e.preventDefault();
    setDisabled(true);

    toggleLike()
      .then(function (response) {
        if (!response || !response.success) return;
        setStyle(!!response.isLiked);
        setText(!!response.isLiked);
      })
      .catch(function (jqXHR) {
        const msg =
          jqXHR && jqXHR.responseJSON && jqXHR.responseJSON.error
            ? jqXHR.responseJSON.error
            : 'Failed to toggle like.';
        showError(msg);
      })
      .always(function () {
        setDisabled(false);
      });
  });
})(window.jQuery);
