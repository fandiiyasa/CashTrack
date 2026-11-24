// Middleware auth: hanya izinkan permintaan yang memiliki session login.
export function auth(req, res, next) {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ pesan: 'Silakan login terlebih dahulu' });
  }

  // Id pengguna selalu diambil dari session, bukan dari body/query.
  req.user_id = req.session.user_id;
  next();
}
