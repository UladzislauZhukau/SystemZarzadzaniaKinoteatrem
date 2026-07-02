import client from "./client";

// Auth
export const login = (email, password) =>
  client.post("/auth/login", { email, password }).then((r) => r.data);
export const register = (payload) =>
  client.post("/auth/register", payload).then((r) => r.data);
export const getMe = () => client.get("/auth/me").then((r) => r.data);

// Movies
export const getMovies = () => client.get("/movies").then((r) => r.data);
export const getMovie = (id) => client.get(`/movies/${id}`).then((r) => r.data);
export const lookupMovie = (title) =>
  client.get("/movies/lookup", { params: { title } }).then((r) => r.data);
export const createMovie = (data) => client.post("/movies", data).then((r) => r.data);
export const updateMovie = (id, data) =>
  client.put(`/movies/${id}`, data).then((r) => r.data);
export const deleteMovie = (id) => client.delete(`/movies/${id}`);
export const getMovieReviews = (id) =>
  client.get(`/movies/${id}/reviews`).then((r) => r.data);
export const createMovieReview = (id, data) =>
  client.post(`/movies/${id}/reviews`, data).then((r) => r.data);
export const updateMovieReview = (movieId, reviewId, data) =>
  client.put(`/movies/${movieId}/reviews/${reviewId}`, data).then((r) => r.data);
export const deleteMovieReview = (movieId, reviewId) =>
  client.delete(`/movies/${movieId}/reviews/${reviewId}`);

// Halls
export const getHalls = () => client.get("/halls").then((r) => r.data);
export const createHall = (data) => client.post("/halls", data).then((r) => r.data);
export const updateHall = (id, data) =>
  client.put(`/halls/${id}`, data).then((r) => r.data);
export const deleteHall = (id) => client.delete(`/halls/${id}`);

// Screenings
export const getScreenings = (movieId) =>
  client
    .get("/screenings", { params: movieId ? { movie_id: movieId } : {} })
    .then((r) => r.data);
export const getScreening = (id) =>
  client.get(`/screenings/${id}`).then((r) => r.data);
export const getAvailableSeats = (id) =>
  client.get(`/screenings/${id}/available-seats`).then((r) => r.data);
export const getSeatmap = (id) =>
  client.get(`/screenings/${id}/seatmap`).then((r) => r.data);
export const createScreening = (data) =>
  client.post("/screenings", data).then((r) => r.data);
export const updateScreening = (id, data) =>
  client.put(`/screenings/${id}`, data).then((r) => r.data);
export const deleteScreening = (id) => client.delete(`/screenings/${id}`);

// Reservations
export const getMyReservations = () =>
  client.get("/reservations").then((r) => r.data);
export const createReservation = (data) =>
  client.post("/reservations", data).then((r) => r.data);
export const createGuestReservation = (data) =>
  client.post("/reservations/guest", data).then((r) => r.data);
export const createBulkReservation = (data) =>
  client.post("/reservations/bulk", data).then((r) => r.data);
export const createGuestBulkReservation = (data) =>
  client.post("/reservations/guest/bulk", data).then((r) => r.data);
export const cancelReservation = (id) =>
  client.post(`/reservations/${id}/cancel`).then((r) => r.data);
