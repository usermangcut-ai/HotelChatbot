from agent import knowledge
from agent.prompts import build_system_prompt


def test_prompt_mentions_persona_tools_scope():
    p = build_system_prompt()
    assert "Shanghai Resort" in p
    assert "lễ tân" in p or "quản lý" in p
    assert "knowledge_tool" in p and "availability_tool" in p
    assert "Danh sách hạng phòng" in p


def test_prompt_forces_grounding_via_tool():
    p = build_system_prompt()
    assert "ALWAYS lấy MỌI thông tin" in p


def test_prompt_forbids_inference_beyond_tool_result():
    p = build_system_prompt()
    assert "suy luận" in p


def test_prompt_rejects_out_of_scope_topics():
    p = build_system_prompt()
    assert "ngoài phạm vi resort" in p


def test_prompt_mentions_booking_tool():
    p = build_system_prompt()
    assert "open_booking_form_tool" in p


def test_prompt_forbids_agent_from_claiming_booking_done():
    p = build_system_prompt()
    assert "tự nhận đã đặt phòng/dịch vụ xong" in p


def test_prompt_has_no_service_ticket_tool():
    """open_service_ticket_tool đã bị gỡ — nhà hàng/spa là tương tác vật lý, chỉ qua UI sau đăng
    nhập tài khoản khách, không qua Agent (giống gọi nhân viên)."""
    p = build_system_prompt()
    assert "open_service_ticket_tool" not in p


def test_prompt_forbids_implying_broader_booking_capability():
    p = build_system_prompt()
    assert "NEVER ngụ ý" in p


def test_prompt_mentions_show_photos_tool():
    p = build_system_prompt()
    assert "show_photos_tool" in p


def test_prompt_forbids_asking_dates_without_booking_intent():
    """Khóa đúng bug đã tìm ra: model hỏi ngày nhận/trả cho cả câu tư vấn không có ý định đặt phòng."""
    p = build_system_prompt()
    assert "ĐỪNG hỏi ngày trước khi gọi" in p
    assert "NEVER tự hỏi ngày nhận/trả phòng nếu khách chưa nêu ý định đặt phòng" in p


def test_prompt_uses_if_then_decision_policy():
    p = build_system_prompt()
    assert "DECISION POLICY" in p
    assert p.count("IF ") >= 5 and "THEN" in p


def test_prompt_includes_hotel_overview_facts_from_knowledge_base():
    """SĐT/đánh giá/quy mô là fact quan trọng hay bị hỏi — nhúng thẳng từ knowledge.json vào prompt
    (1 nguồn duy nhất) để loại rủi ro model bịa số khi lỡ bỏ qua bước gọi tool."""
    p = build_system_prompt()
    overview = knowledge.get_node_by_title("Thông tin chung")
    assert overview["text"] in p
