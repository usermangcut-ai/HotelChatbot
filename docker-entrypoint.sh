#!/bin/sh
# Volume của PaaS (Railway) được mount với chủ sở hữu root → appuser (uid 1000) không ghi được hotel.db.
# Container khởi động bằng root đúng một bước: sửa quyền thư mục storage, rồi hạ xuống appuser để chạy app.
set -e
if [ "$(id -u)" = "0" ]; then
  mkdir -p "$STORAGE_DIR"
  chown -R 1000:1000 "$STORAGE_DIR"
  exec setpriv --reuid=1000 --regid=1000 --init-groups "$@"
fi
exec "$@"
