# Workflow Caixa - Checkout Accesibilidad

## Referencia de diseño (Figma)

**URL:** https://www.figma.com/design/oxpUpwD9YSQBNMVgs6pRxD/-PRO--Accesibilidad-Checkout?node-id=2107-19712&t=7tYtXO1R0vczEhsz-0

Para todo lo relativo a **padding, margin, tipografía, espaciado** y estructura visual, consultar este Figma como fuente de verdad.

## Entorno local

- Tras poner las cookies, navegar a: **http://localhost:8012/pnbl/part/es/faciliteacheckout**

## Flujo de trabajo para bugs visuales

1. Pol envía **dos imágenes**:
   - **Checkout** → captura de localhost (estado actual)
   - **Figma** → captura del diseño esperado
2. El objetivo es dejar el checkout **igual que en Figma**.
3. Añadir **solo los estilos necesarios** para solucionar el bug/tarea concreto.
4. **No** replicar todos los estilos de Figma — solo los que corrijan la diferencia.

## Reglas de estilos

- Mínimo cambio necesario. No sobrecargar con propiedades innecesarias.
- Si un estilo ya existe y funciona, no tocarlo.
- Priorizar consistencia con lo que ya hay en el código.
