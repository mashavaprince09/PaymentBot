from typing import Final
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters
import socket

TOKEN: Final = "7237997620:AAF7WAEi_KrLRkImusn-6B0AzcenCjuYsNg"
botUsername: Final = '@uctPayment_Bot'

# Define states
SENDER_WALLET, RECIPIENT_WALLET, AMOUNT = range(3)

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text('Hello! I am Tippy, at your service.\nUse Commands> [> /start : to initiate.\n> /help: To view options.\n> /custom: To see custom info.\n ]')

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("Create new Account", callback_data='1')],
        [InlineKeyboardButton("Send Money to Contact", callback_data='2')],
        [InlineKeyboardButton("Send Wallet Address", callback_data='3')],
        [InlineKeyboardButton("Check Account Balance", callback_data='4')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text('How may I assist you today?', reply_markup=reply_markup)

async def custom_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text('This is a custom command!')

def handle_response(text: str):
    if text == '1':
        return 'Please use following link to create Digital Wallet: rafiki.money'
    elif text == '2':
        return "Payment is being processed..."
    elif text == '3':
        return 'Please provide your access code/key.'
    elif text == '4':
        return "Thank you, see you next time!"
    elif "SEND" in text:
        info = text.split(" ")
        message = f"{info[1]} {info[2]} {info[3]}"
        response = send_to_tcp_server(message)
        return response
    else:
        return 'Please select a valid option. or use /help to view menu or /start to restart Bot or /custom to make custom command'

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message_type: str = update.message.chat.type
    text: str = update.message.text
    print(f'User :[{update.message.chat.id}] ~ {text}')

    if message_type == 'group':
        if botUsername in text:
            new_text: str = text.replace(botUsername, '').strip()
            response: str = handle_response(new_text)
        else:
            return
    else:
        response: str = handle_response(text)
    print("Tippy:", response)
    await update.message.reply_text(response)

async def button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    response = handle_response(query.data)
    await query.edit_message_text(text=response)

    if query.data == '2':
        await query.message.reply_text('Please provide your e-wallet address, recipient, and Amount [SEND sender receiver R***]: ')
        return SENDER_WALLET

def send_to_tcp_server(message: str) -> str:
    host = socket.gethostbyname(socket.gethostname())
    port = 3002
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.connect((host, port))
            s.sendall(message.encode())
            data = s.recv(1024)
            return data.decode()
    except ConnectionRefusedError:
        return "Failed to connect to the TCP server."
    except Exception as e:
        return f"An error occurred: {str(e)}"

async def error(update: Update, context: ContextTypes.DEFAULT_TYPE):
    print(f'Update {update} caused error {context.error}')

if __name__ == '__main__':
    print("Launching Tippy Bot! Command Tippy > [> /start : to initiate BOT.\n> /help: To view options.\n> /custom: To see custom info.\n ]")
    app = Application.builder().token(TOKEN).build()

    # Add handlers for commands
    app.add_handler(CommandHandler('start', start_command))
    app.add_handler(CommandHandler('help', help_command))
    app.add_handler(CommandHandler('custom', custom_command))

    # Add handler for button presses
    app.add_handler(CallbackQueryHandler(button))

    # Add message handler
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # Add error handler
    app.add_error_handler(error)

    # Polls the bot
    print("Polling...")
    app.run_polling(poll_interval=3)

