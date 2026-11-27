# Groble 매장 광고

승인된 운영자가 **매장 상세 → Groble 매장 광고**에서 단가와 노출 시간을 확인하고 결제창을 엽니다. 서버가 주문을 만들 때 해당 지점의 운영 권한을 다시 확인합니다. 공개 **할인·혜택 → 광고 매장**은 결제가 확인된 지점만 노출합니다. 광고 기간은 서버에 결제가 정상 반영된 시점부터 계산합니다.

결제창 링크에 CampuSpot이 만든 주문 참조값을 전달합니다. 서버는 원본 본문 서명, 5분 이내 서명 시각, 상품 ID, 원화 결제액, 구매 시각과 주문 번호를 확인합니다. 전달·이벤트·결제 식별자로 재전송 및 중복 반영을 막습니다. 웹훅 원문과 구매자 이메일·전화번호·카드 정보는 저장하지 않습니다. 결제 후 같은 지점에서 **광고 결제 상태 새로고침**으로 상태를 확인할 수 있습니다.

환불은 Groble 판매 관리에서 처리합니다. 환불 요청은 상태에 표시하고 부분·전액 환불 완료 시 광고 노출을 중단합니다. 먼저 도착한 환불도 완료 웹훅을 받으면 같은 결제 식별자로 대조합니다. 같은 결제 링크로 별도 결제가 발생해도 광고가 중복 활성화되지 않습니다. 관리자는 **혜택 제보 검수 → 매장 광고 결제 검토**의 거래 번호를 Groble 판매 관리와 대조합니다.

## 개발 환경 연결

1. Groble 상품 관리에서 **결제창 → 일반결제 → 서비스** 상품 초안을 만듭니다. 제목은 CampuSpot 매장 광고, 제공 내용은 할인·혜택 페이지의 광고 매장 영역에 등록 지점 노출로 입력합니다. 승인받은 가격과 노출 기간을 안내에 적고 결제 쿠폰이나 추가 옵션이 적용되지 않도록 설정합니다.
2. Groble 웹훅에 `<개발용 Supabase 프로젝트 URL>/functions/v1/groble-webhook`을 등록합니다. `payment.completed`, `payment.cancel_requested`, `payment.refunded`를 선택합니다. 발급받은 서명 시크릿은 Supabase 서버 시크릿에 저장합니다.
3. 판매자 콘솔에서 확인한 구매자용 결제 URL과 인코딩 상품 ID, 원화 가격, 시간 단위 노출 기간을 설정합니다. 기간은 1–720시간을 지원합니다. 이전 서명 키는 키 교체 구간에만 설정합니다.
4. 마이그레이션과 두 Edge Function을 준비한 뒤 Groble 콘솔의 테스트 발송으로 서명 수신을 확인합니다. 콘솔의 테스트 발송은 광고를 활성화하지 않습니다. 승인받은 테스트 주문 환경에서 확인한 뒤 구매를 엽니다.

```dotenv
GROBLE_ENABLE_CHECKOUT=false
GROBLE_CHECKOUT_URL=
GROBLE_PRODUCT_ID=
GROBLE_AMOUNT_KRW=
GROBLE_AD_DURATION_HOURS=
GROBLE_WEBHOOK_SECRET=
GROBLE_WEBHOOK_SECRET_PREVIOUS=
```

개발과 운영 프로젝트는 별도의 시크릿과 결제 링크를 사용합니다. 실제 상품 검수, 정산, 환불 처리는 Groble 판매 관리에서 진행합니다. 결제창 URL, 상품 정보 또는 시크릿이 빠지면 구매 버튼이 숨겨집니다. 이 기능의 적용 범위는 매장 광고 일반결제입니다.

공식 문서 (2026-11-28 확인) — [결제창 만들기](https://www.groble.im/help/guides/payment-window) · [웹훅 연동](https://www.groble.im/help/guides/webhook) · [웹훅 이벤트](https://www.groble.im/help/guides/webhook-events).
