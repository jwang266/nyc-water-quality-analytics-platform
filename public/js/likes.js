import { likeBorough } from './apiClient.js';
import { showToast } from './toast.js';

const $ = window.jQuery;
const likeButton = $('#like-button');
const likeStatus = $('#like-status');

if (likeButton.length > 0) {
  function setDisabled(v) {
    likeButton.prop('disabled', !!v);
  }

  function setText(isLiked) {
    likeStatus.text(isLiked ? 'Liked!' : 'Like This Borough');
  }

  function setStyle(isLiked) {
    if (isLiked) {
      likeButton
        .removeClass('bg-white text-red-600 hover:bg-red-50 border-red-300')
        .addClass('bg-red-600 text-white hover:bg-red-700 border-red-600');
    } else {
      likeButton
        .removeClass('bg-red-600 text-white hover:bg-red-700 border-red-600')
        .addClass('bg-white text-red-600 hover:bg-red-50 border-red-300');
    }
  }

  likeButton.on('click', async function (e) {
    e.preventDefault();

    const boroughId = likeButton.data('borough-id');
    if (!boroughId) {
      showToast('Missing borough id.', { error: true });
      return;
    }

    setDisabled(true);

    try {
      const response = await likeBorough(boroughId);
      if (!response || !response.success) return;

      setStyle(!!response.isLiked);
      setText(!!response.isLiked);
      showToast(response.isLiked ? 'Borough liked!' : 'Like removed.');
    } catch (err) {
      const msg =
        (err.data && err.data.error) || err.message || 'Failed to toggle like.';
      showToast(msg, { error: true });
    } finally {
      setDisabled(false);
    }
  });
}
