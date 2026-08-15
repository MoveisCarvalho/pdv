export function gerarPayloadPix(
    pixKey: string,
    amount: number,
    merchantName: string,
    merchantCity: string,
    txid: string = '***'
): string {
    const formatField = (id: string, value: string) => {
        const len = String(value.length).padStart(2, '0');
        return `${id}${len}${value}`;
    };

    const normalizeText = (str: string) => {
        return str
            ? str
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9 ]/g, '')
                .toUpperCase()
                .trim()
            : '';
    };

    let formattedKey = pixKey.trim();
    const digits = formattedKey.replace(/\D/g, '');

    if (!formattedKey.startsWith('+') && (digits.length === 10 || digits.length === 11)) {
        formattedKey = `+55${digits}`;
    } else if (!formattedKey.startsWith('+') && digits.length === 13 && digits.startsWith('55')) {
        formattedKey = `+${digits}`;
    }

    const formattedAmount = amount.toFixed(2);
    const cleanMerchantName = normalizeText(merchantName).substring(0, 25) || 'MOTA CARVALHO IMOVEIS';
    const cleanMerchantCity = normalizeText(merchantCity).substring(0, 15) || 'SAO PAULO';

    const cleanTxid =
        txid && txid !== '***'
            ? txid.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25)
            : 'MOTACARVALHO';

    const gui = formatField('00', 'BR.GOV.BCB.PIX');
    const keyField = formatField('01', formattedKey);
    const merchantAccountInfo = formatField('26', gui + keyField);

    const txidField = formatField('05', cleanTxid);
    const additionalDataField = formatField('62', txidField);

    const payloadWithoutCRC =
        formatField('00', '01') +
        merchantAccountInfo +
        formatField('52', '0000') +
        formatField('53', '986') +
        formatField('54', formattedAmount) +
        formatField('58', 'BR') +
        formatField('59', cleanMerchantName) +
        formatField('60', cleanMerchantCity) +
        additionalDataField +
        '6304';

    const calculateCRC16 = (str: string) => {
        let crc = 0xFFFF;
        for (let c = 0; c < str.length; c++) {
            crc ^= str.charCodeAt(c) << 8;
            for (let i = 0; i < 8; i++) {
                if ((crc & 0x8000) !== 0) {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc = crc << 1;
                }
                crc &= 0xFFFF;
            }
        }
        return crc.toString(16).toUpperCase().padStart(4, '0');
    };

    return payloadWithoutCRC + calculateCRC16(payloadWithoutCRC);
}