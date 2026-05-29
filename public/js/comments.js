import { submitComment, deleteComment } from './apiClient.js';
import { showToast } from './toast.js';

const $ = window.jQuery;
const commentForm = $('#comment-form');

if (commentForm.length > 0) {
  const commentTextarea = $('#comment-text');
  const commentList = $('#comment-list');
  const commentErrorDiv = $('#comment-error');

  let initialTip = $('#comments-section p').filter(function () {
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
        '<p class="text-gray-500 mt-3">Be the first to leave a comment!</p>'
      );
      initialTip = $('#comments-section p').filter(function () {
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

  function buildCommentItem(comment) {
    let name = 'Deleted User';
    if (comment && comment.user) {
      name = (textOrNA(comment.user.fname) + ' ' + textOrNA(comment.user.lname)).trim();
      if (!name) name = 'Deleted User';
    }

    const userNode = comment && comment.user
      ? $('<strong></strong>').text(name)
      : $('<span></span>').addClass('text-red-700').text('Deleted User');

    const listItem = $('<li></li>')
      .addClass(
        'flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 bg-gray-50 px-4 py-3 rounded border border-gray-200'
      )
      .attr('data-comment-id', comment && comment._id ? comment._id : '');

    const contentDiv = $('<div></div>');

    const commentText = comment ? textOrNA(comment.comment) : 'N/A';
    const commentP = $('<p></p>').addClass('mb-1 text-gray-900').text(commentText);

    const when = comment ? formatDate(comment.commentDate) : 'N/A';
    const smallText = $('<small></small>')
      .addClass('text-gray-500')
      .append('Posted by ')
      .append(userNode)
      .append(' on ' + when);

    contentDiv.append(commentP).append(smallText);
    listItem.append(contentDiv);

    if (comment && comment._id) {
      const deleteButton = $('<button></button>')
        .attr('type', 'button')
        .addClass(
          'delete-comment-btn delete-button px-3 py-1.5 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 mt-4 sm:mt-0'
        )
        .attr('data-comment-id', comment._id)
        .css({ flexShrink: 0, fontSize: '0.8rem' })
        .text('Delete');
      listItem.append(deleteButton);
    }

    return listItem;
  }

  commentForm.on('submit', async function (e) {
    e.preventDefault();
    hideError();
    commentForm.find('button[type="submit"]').prop('disabled', true);

    const boroughId = getBoroughId();
    if (!boroughId) {
      showError('Missing borough id.');
      commentForm.find('button[type="submit"]').prop('disabled', false);
      return;
    }

    const comment = (commentTextarea.val() || '').trim();
    if (!comment || comment.length > 200) {
      showError('Comment cannot be empty or exceeds 200 characters.');
      commentForm.find('button[type="submit"]').prop('disabled', false);
      return;
    }

    try {
      const newComment = await submitComment(boroughId, comment);
      commentTextarea.val('');
      updateCommentCount(1);
      commentList.prepend(buildCommentItem(newComment));
      showToast('Comment posted.');
    } catch (err) {
      const msg =
        (err.data && err.data.error) ||
        err.message ||
        'An error occurred while posting comment.';
      showError(msg);
      showToast(msg, { error: true });
    } finally {
      commentForm.find('button[type="submit"]').prop('disabled', false);
    }
  });

  commentList.on('click', '.delete-comment-btn', async function (e) {
    e.preventDefault();

    const deleteButton = $(this);
    const commentId = deleteButton.data('comment-id');

    if (!confirm('Are you sure you want to delete this comment?')) return;

    deleteButton.prop('disabled', true);

    try {
      await deleteComment(commentId);
      deleteButton.closest('li[data-comment-id]').remove();
      updateCommentCount(-1);
      showToast('Comment deleted.');
    } catch (err) {
      const errorMsg =
        (err.data && err.data.error) || err.message || 'Failed to delete comment.';
      showToast(errorMsg, { error: true });
    } finally {
      deleteButton.prop('disabled', false);
    }
  });
}
