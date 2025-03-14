const resetPasswordTemplate = (otp) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperación de contraseña</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
      text-align: center;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #7E22CE;
      padding: 20px;
      color: white;
      font-size: 20px;
      font-weight: bold;
      border-radius: 8px 8px 0 0;
    }
    .content {
      margin: 20px 0;
      font-size: 16px;
      color: #333;
    }
    .otp {
      font-size: 24px;
      font-weight: bold;
      color: #7E22CE;
      background: #F3E8FF;
      padding: 10px;
      border-radius: 5px;
      display: inline-block;
      margin: 10px 0;
    }
    .footer {
      margin-top: 20px;
      font-size: 14px;
      color: #777;
    }
    .btn {
      display: inline-block;
      padding: 5px 10px;
      background-color: #7E22CE;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      font-size: 12px;
    }
    .btn:hover {
      background-color: #6B21A8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">🔐 Recuperación de Contraseña</div>
    <div class="content">
      <p>Hola,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código OTP:</p>
      <div class="otp">${otp}</div>
      <p>Si no solicitaste esto, puedes ignorar este mensaje.</p>
    </div>
    <div class="footer">Powered by <a href="https://botopia.tech" class="btn">Botopia</a></div>
  </div>
</body>
</html>
`;
const notifyNewPassword = (password) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperación de contraseña</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
      text-align: center;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #7E22CE;
      padding: 20px;
      color: white;
      font-size: 20px;
      font-weight: bold;
      border-radius: 8px 8px 0 0;
    }
    .content {
      margin: 20px 0;
      font-size: 16px;
      color: #333;
    }
    .otp {
      font-size: 24px;
      font-weight: bold;
      color: #7E22CE;
      background: #F3E8FF;
      padding: 10px;
      border-radius: 5px;
      display: inline-block;
      margin: 10px 0;
    }
    .footer {
      margin-top: 20px;
      font-size: 14px;
      color: #777;
    }
    .btn {
      display: inline-block;
      padding: 5px 10px;
      background-color: #7E22CE;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      font-size: 12px;
    }
    .btn:hover {
      background-color: #6B21A8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">🔐 Nueva contraseña</div>
    <div class="content">
      <p>Hola,</p>
      <p>El administrador ha restablecido tu contraseña, la cuál ahora es:</p>
      <div class="otp">${password}</div>
    </div>
    <div class="footer">Powered by <a href="https://botopia.tech" class="btn">Botopia</a></div>
  </div>
</body>
</html>
`;
module.exports = { emailTemplate: resetPasswordTemplate, notifyNewPassword };
