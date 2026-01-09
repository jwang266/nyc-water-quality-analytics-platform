(function ($) {
  const commentForm = $('#comment-form');
  if (commentForm.length === 0) return;

  const commentTextarea = $('#comment-text');
  const commentList = $('#comment-list');
  const commentErrorDiv = $('#comment-error');

  let initialTip = $('#comments-section p.text-muted').filter(function () {
    return $(this).text().includes('Be the first');
  });

  function getBoroughId() {
    return commentForm.data('borough-id');
  }

  function showError(msg) {
    commentErrorDiv.text(msg).removeClass('hidden');
  }

  function hideError() {
    commentErrorDiv.text('').addClass('hidden');
  }

  // Keep the header count in sync with the list
  function updateCommentCount(delta) {
    const h2 = $('#comments-section h2');
    const m = (h2.text() || '').match(/\((\d+)\)/);
    const current = m ? parseInt(m[1], 10) : commentList.children().length;
    const newCount = Math.max(0, current + delta);

    h2.text(`Community Feedback (${newCount})`);

    if (newCount > 0 && initialTip && initialTip.length > 0) {
      initialTip.remove();
      initialTip = null;
    } else if (newCount === 0 && !initialTip) {
      $('#comments-section').append(
        '<p class="text-muted" style="margin-top: 15px;">Be the first to leave a comment!</p>'
      );
      initialTip = $('#comments-section p.text-muted').filter(function () {
        return $(this).text().includes('Be the first');
      });
    }
  }

  function textOrNA(v) {
    if (v === null || v === undefined) return 'N/A';
    if (typeof v !== 'string') return String(v);
    const s = v.trim();
    return s.length ? s : 'N/A';
  }

  function formatDate(d) {
    try {
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return 'N/A';
      return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString();
    } catch {
      return 'N/A';
    }
  }

  function apiPost(url, body) {
    return $.ajax({
      method: 'POST',
      url,
      contentType: 'application/json',
      data: JSON.stringify(body || {})
    });
  }

  function submitComment() {
    const boroughId = getBoroughId();
    if (!boroughId) {
      return $.Deferred().reject({ msg: 'Missing borough id.' }).promise();
    }

    const comment = (commentTextarea.val() || '').trim();
    if (!comment || comment.length > 200) {
      return $.Deferred()
        .reject({ msg: 'Comment cannot be empty or exceeds 200 characters.' })
        .promise();
    }

    return apiPost('/api/comments', { boroughId, comment });
  }

  // Build one comment <li> for immediate insert
  function buildCommentItem(comment) {
    let name = 'Deleted User';
    if (comment && comment.user) {
      name = (textOrNA(comment.user.fname) + ' ' + textOrNA(comment.user.lname)).trim();
      if (!name) name = 'Deleted User';
    }

    const userNode = comment && comment.user
      ? $('<strong></strong>').text(name)
      : $('<span></span>').attr('style', 'color: #dc3545;').text('Deleted User');

    const listItem = $('<li></li>')
      .addClass('list-group-item d-flex justify-content-between align-items-start')
      .attr('data-comment-id', comment && comment._id ? comment._id : '');

    const contentDiv = $('<div></div>').attr('style', 'flex-grow: 1; margin-right: 15px;');

    const commentText = comment ? textOrNA(comment.comment) : 'N/A';
    const commentP = $('<p></p>').addClass('mb-1').text(commentText);

    const when = comment ? formatDate(comment.commentDate) : 'N/A';
    const smallText = $('<small></small>')
      .addClass('text-muted')
      .append('Posted by ')
      .append(userNode)
      .append(' on ' + when);

    contentDiv.append(commentP).append(smallText);
    listItem.append(contentDiv);

    return listItem;
  }

  commentForm.on('submit', function (e) {
    e.preventDefault();
    hideError();
    commentForm.find('button[type="submit"]').prop('disabled', true);

    submitComment()
      .then(function (newComment) {
        commentTextarea.val('');
        updateCommentCount(1);
        commentList.prepend(buildCommentItem(newComment));
      })
      .catch(function (err) {
        if (err && err.msg) return showError(err.msg);
        const msg =
          err && err.responseJSON && err.responseJSON.error
            ? err.responseJSON.error
            : 'An error occurred while posting comment.';
        showError(msg);
      })
      .always(function () {
        commentForm.find('button[type="submit"]').prop('disabled', false);
      });
  });

  // Delete comment
  commentList.on('click', '.delete-comment-btn', function (e) {
    e.preventDefault();

    const deleteButton = $(this);
    const commentId = deleteButton.data('comment-id');

    if (!confirm('Are you sure you want to delete this comment?')) return;

    deleteButton.prop('disabled', true);

    $.ajax({
      method: 'DELETE',
      url: `/api/comments/${commentId}`,
      contentType: 'application/json'
    })
      .done(function () {
        deleteButton.closest('li.list-group-item, li.stats-row').remove();
        updateCommentCount(-1);
      })
      .fail(function (jqXHR) {
        const errorMsg = jqXHR.responseJSON?.error || 'Failed to delete comment.';
        alert('Error deleting comment: ' + errorMsg);
      })
      .always(function () {
        deleteButton.prop('disabled', false);
      });
  });
})(window.jQuery);
