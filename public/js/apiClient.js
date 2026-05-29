async function requestJson(url, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...options.headers
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers
    });
  } catch (networkError) {
    console.error('[apiClient] Network error:', url, networkError);
    throw networkError;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = (data && data.error) || `Request failed: ${response.status}`;
    console.error('[apiClient] HTTP error:', response.status, url, data);
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function likeBorough(id) {
  return requestJson(`/boroughs/${id}/like`, { method: 'POST' });
}

export async function submitComment(boroughId, commentText) {
  return requestJson('/api/comments', {
    method: 'POST',
    body: JSON.stringify({ boroughId, comment: commentText })
  });
}

export async function deleteComment(commentId) {
  return requestJson(`/api/comments/${commentId}`, { method: 'DELETE' });
}

export async function getDataDates() {
  return requestJson('/api/data-dates');
}

export async function getBoroughStats({ year, month, day } = {}) {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (month) params.set('month', String(month));
  if (day) params.set('day', String(day));
  const query = params.toString();
  return requestJson(`/api/borough-stats${query ? `?${query}` : ''}`);
}

export async function getBoroughTrends({ borough, year, month, metric }) {
  const params = new URLSearchParams({
    borough: String(borough),
    year: String(year),
    metric: String(metric)
  });
  if (month) params.set('month', String(month));
  return requestJson(`/api/borough-trends?${params}`);
}
