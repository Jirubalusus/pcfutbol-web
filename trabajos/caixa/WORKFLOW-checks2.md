# WORKFLOW - checks2 (Faciliteà Checkout)

## ⚠️ ACTIVACIÓN
- **SOLO trabajar en este repo cuando Pol diga "CAPGEMINI"**
- **Dejar de trabajar cuando Pol diga "CAPGEMINI OUT"**
- Si no dice CAPGEMINI, NO entrar ni tocar este repositorio

## Requisitos
- **Node:** 18 o superior (SOLO para este repo, usar fnm)
- **npm:** 9 o superior
- **URL local:** http://localhost:8012/pnbl/part/es/faciliteacheckout
- **fnm path:** C:\Users\Pablo\AppData\Local\Microsoft\WinGet\Packages\Schniz.fnm_Microsoft.Winget.Source_8wekyb3d8bbwe\fnm.exe
- **Comando para activar Node 18:**
  ```
  $fnm = "C:\Users\Pablo\AppData\Local\Microsoft\WinGet\Packages\Schniz.fnm_Microsoft.Winget.Source_8wekyb3d8bbwe\fnm.exe"
  $env:NODE_OPTIONS = ""
  & $fnm env --use-on-cd | Out-String | Invoke-Expression
  & $fnm use 18
  ```

## Antes de empezar a trabajar

### 1. Arrancar servidor y cookies
- Lanzar el servidor (`npm start`)
- Informar a Pol del progreso de la build
- Esperar a que termine la build completamente
- Al cargar la página, el browser pedirá usuario y contraseña:
  - **Usuario:** storefront
  - **Contraseña:** Wivai2021
- Una vez el servidor esté listo, pedir las cookies a Pol: "Servidor listo. Pásame las cookies"
- Usar la extensión de Chrome **Cookie-Editor** para gestionar cookies
- Borrar TODAS las cookies del localhost
- Importar las cookies que Pol pase
- Confirmar: "Cookies implementadas!"

### 2. Ramas
- Siempre partir de `feature/monolito`
- Hacer `git pull` en feature/monolito
- Cuando esté "already up to date", preguntar: "¿Cómo quieres que llame a la rama nueva de trabajo?"
- Crear la nueva rama desde feature/monolito con el nombre que Pol dé

### 3. Validación inicial
- Arrancar el servidor local
- Verificar que http://localhost:8012/pnbl/part/es/faciliteacheckout muestra el formulario de checkout
- El formulario debe verse como la referencia (paso 1: datos envío)

### 4. Flujo de trabajo
- Pol pasa tareas/bugs
- Realizarlas en la rama de trabajo (buscar SIEMPRE la solución más sencilla y fácil)
- Validar que todo está OK
- Enviar capturas del localhost mostrando el resultado
- Repetir con todas las tareas/bugs indicadas

### 5. Subida de cambios
- Cuando Pol diga que suba: `git push` de la rama de trabajo
- Informar a Pol que está subida
- Una vez confirmado, volver a `feature/monolito`
- Informar a Pol que estamos en feature/monolito

### 6. Navegación del checkout (3 pasos)
- **Paso 1:** Datos de envío (nombre, apellidos, dirección, contacto, documento)
- **Paso 2:** Datos de pago (código promocional, en cuotas/al contado, tarjeta CaixaBank)
- **Paso 3:** Confirmación

### 7. Datos de prueba para Paso 1 (rellenar y dar a "Continuar")
- **Nombre:** adsf
- **Primer apellido:** fdas
- **Segundo apellido:** fdsa
- **Vía, número y piso/puerta:** fdas
- **Código postal:** 21005
- **Población:** Huelva
- **Provincia:** Huelva
- **✅ Utilizar estos mismos datos para la facturación:** checked
- **Prefijo:** España (+34)
- **Móvil:** 684362349
- **Correo Electrónico:** pablogarciabasolo@gmail.com
- **Tipo de documento:** NIF
- **Número de documento:** 49114927Z

### 8. Tarjetas de prueba (Paso 2)
Fuente: https://pagosonline.redsys.es/desarrolladores-inicio/integrate-con-nosotros/tarjetas-y-entornos-de-prueba/
- **VISA EMV3DS 2.2:** 4548 8100 0000 0003 | Vencimiento: 12/49 | CVV: 123
- **Mastercard EMV3DS 2.1:** 5576 4415 6304 5037 | Vencimiento: 12/49 | CVV: 123

### 9. Accesibilidad
- Muchos bugs serán de accesibilidad
- Validar con NVDA (https://nvda.es/) — es el lector de pantalla que usan ellos
- Instalar NVDA si no está instalado

### 10. Al terminar
- Push de la rama de trabajo
- Informar a Pol que el push está hecho
- Volver a `feature/monolito`
- Informar a Pol que estamos en feature/monolito

## Referencia visual
### Paso 1 - Datos de envío
- Sección "Datos de envío" (nombre, apellidos)
- Sección "Dirección de envío" (vía, CP, población, provincia)
- Checkbox "Utilizar estos mismos datos para la facturación"
- Sección "Datos de contacto" (prefijo, móvil, correo, tipo documento, nº documento)
- Panel derecho "Mi pedido" (producto, fecha entrega, info envío/pago)

### Paso 2 - Datos de pago
- Resumen datos envío/facturación con botón "Modificar"
- Código promocional (desplegable)
- Selección: "En cuotas" / "Al contado"
- Exclusivo clientes CaixaBank: pago con tarjeta crédito (20 cuotas / 4 cuotas 5% reembolso)
- Campos: Número tarjeta, Vencimiento (MM/AA), CVV
- Info condiciones de financiación
