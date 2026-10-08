from agent import photos


def test_valid_subjects_has_hotel_and_8_rooms():
    subs = photos.valid_subjects()
    assert "hotel" in subs
    assert len(subs) == 9
    assert "Deluxe Queen" in subs


def test_photo_path_hotel(tmp_path):
    (tmp_path / "hotel.jpg").write_bytes(b"x")
    assert photos.photo_path("hotel", images_dir=str(tmp_path)) == str(tmp_path / "hotel.jpg")


def test_photo_path_room_by_title(tmp_path):
    (tmp_path / "room_deluxe_queen.png").write_bytes(b"x")
    assert photos.photo_path("Deluxe Queen", images_dir=str(tmp_path)) == str(
        tmp_path / "room_deluxe_queen.png")


def test_photo_path_missing_file_returns_none(tmp_path):
    assert photos.photo_path("Deluxe Queen", images_dir=str(tmp_path)) is None


def test_photo_path_unknown_subject_returns_none(tmp_path):
    assert photos.photo_path("không tồn tại", images_dir=str(tmp_path)) is None


def test_photo_url_carries_a_version_that_changes_when_the_file_changes(tmp_path):
    import os
    f = tmp_path / "hotel.jpg"
    f.write_bytes(b"a")
    os.utime(f, (1000, 1000))
    first = photos.photo_url(str(f))
    assert first == "/images/hotel.jpg?v=1000"
    os.utime(f, (2000, 2000))
    assert photos.photo_url(str(f)) != first
