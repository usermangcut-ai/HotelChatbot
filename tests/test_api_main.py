from api.main import app


def test_app_exposes_all_public_routes():
    # Dùng app.openapi()["paths"] thay vì duyệt app.routes trực tiếp: bản FastAPI/Starlette
    # cài trong .venv (fastapi 0.139.2 / starlette 1.3.1) bọc router include thành
    # _IncludedRouter (không có .path), nên duyệt app.routes phẳng như cũ sẽ lỗi
    # AttributeError dù route vẫn đăng ký đúng. openapi() luôn cho danh sách path đã phẳng
    # hoá, ổn định qua các phiên bản.
    paths = set(app.openapi()["paths"].keys())
    assert "/api/chat" in paths
    assert "/api/bookings" in paths
    assert "/api/rooms" in paths
    assert "/api/service-requests" in paths
