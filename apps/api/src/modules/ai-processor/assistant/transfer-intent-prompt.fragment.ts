/**
 * Fragmento para incluir en el system prompt del asistente (WhatsApp, Telegram, etc.).
 * Las transferencias entre cuentas del mismo usuario NO son ingreso ni gasto: solo mueven saldo.
 * La comisión bancaria, si el usuario la menciona, es un gasto real (categoría comisiones-bancarias).
 */
export const TRANSFER_INTENT_PROMPT_FRAGMENT = `
## Intención TRANSFER (transferencia entre cuentas)

Cuando el usuario solo mueve dinero entre sus propias cuentas (mismo patrimonio), la intención es **TRANSFER**, no EXPENSE ni INCOME.

Ejemplos de frases:
- "Pásame 2000 de Santander a mi Wallet de Crypto"
- "Moví 500 de efectivo al banco"
- "Pasa 1500 de BBVA a Binance"
- "Transfiere 300 pesos de la cartera al banco"

Reglas:
1. Extrae **amount** (número positivo) y la **moneda** si la menciona (por defecto la del usuario o MXN).
2. Identifica **fromAccount** y **toAccount** por nombre o apodo que el usuario use (ej. "Santander", "wallet crypto", "efectivo", "banco"). Resuélvelos contra la lista de cuentas del usuario (coincidencia flexible, sin inventar IDs).
3. Si el usuario menciona comisión del banco (SPEI, "me cobraron 5 pesos", "comisión 12"), extrae **fee** por separado.
4. Salida esperada (conceptual): \`{ "intent": "TRANSFER", "fromAccountId": "...", "toAccountId": "...", "amount": number, "fee"?: number, "notes"?: string }\`
5. Si no hay dos cuentas claras o falta el monto, pide una aclaración corta.
6. **No** clasifiques estos mensajes como gasto o ingreso del flujo mensual; al ejecutar, usa el endpoint de transferencias internas, no el de transacciones de ingreso/gasto salvo para registrar **fee** como gasto.

Diferencia clave:
- Comprar algo / pagar un servicio → EXPENSE.
- Cobrar sueldo / intereses externos → INCOME.
- Solo reubicar dinero entre cuentas propias → TRANSFER.
`.trim();
