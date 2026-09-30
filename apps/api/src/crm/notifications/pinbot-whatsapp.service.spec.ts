import { PinbotWhatsAppService } from './pinbot-whatsapp.service';

describe('PinbotWhatsAppService', () => {
  const input = {
    apiUrl: 'https://partnersv1.pinbot.ai/v3/sender/messages',
    apiKey: 'tenant-api-key',
    senderNumber: '919876543210',
    recipientNumber: '919123456789',
    template: {
      name: 'trueroot_announcement',
      language: 'en',
      parameters: ['Recipient', 'Title', 'Message'],
    },
  } as const;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records acceptance only when the provider returns a message id', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: 'message-1' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await new PinbotWhatsAppService().send(input);

    expect(result).toEqual({
      accepted: true,
      providerMessageId: 'message-1',
      httpStatus: 200,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      input.apiUrl,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: input.apiKey,
          wanumber: input.senderNumber,
        }),
      }),
    );
  });

  it('does not claim acceptance for a malformed successful response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(new PinbotWhatsAppService().send(input)).resolves.toEqual({
      accepted: false,
      retryable: false,
      httpStatus: 200,
      errorCode: 'MALFORMED_SUCCESS',
      errorMessage: 'Provider accepted the request without a message ID',
    });
  });

  it('marks throttling as retryable', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: 429, message: 'Try later' } }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await expect(new PinbotWhatsAppService().send(input)).resolves.toEqual({
      accepted: false,
      retryable: true,
      httpStatus: 429,
      errorCode: '429',
      errorMessage: 'Try later',
    });
  });
});
