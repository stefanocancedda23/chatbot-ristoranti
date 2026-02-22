import { ChangeDetectorRef, Component, OnInit, NgZone, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class ChatbotComponent implements OnInit {
  bookingForm!: FormGroup;
  lang = 'it';
  config: any;
  datetimeErrorMessage: string | null = null;
  showQuickActions = true;
  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private sanitizer: DomSanitizer,
    private fb: FormBuilder,
    private http: HttpClient,
  ) {}
  private getClientFromUrl(): string {
    const params = new URLSearchParams(window.location.search);
    return params.get('client') || 'demo';
  }

  ngOnInit(): void {
    window.addEventListener('message', (event) => {
      this.zone.run(() => {
        if (!event.data || !event.data.type) return;

        if (event.data.type === 'BOT_OPEN') {
          setTimeout(() => {
            this.scrollToBottom();
          }, 200);
        }
      });
    });
    const client = this.getClientFromUrl();

    this.http.get<any>(`data/${client}.json`).subscribe({
      next: (data) => {
        console.log('✅ JSON ARRIVATO:', data);

        try {
          this.config = data;
          this.cdr.detectChanges();
          // 👇 sicurezza su applyTheme
          if (this.config) {
            applyThemeColors(this.config);
          }
          if (!this.config.business?.activated) {
            window.parent.postMessage({ type: 'BOT_DISABLED' }, '*');
          }
          // 👇 sicurezza su responses
          const welcome = this.config?.responses?.[this.lang]?.benvenuto ?? 'Ciao!';

          this.messages = [
            {
              text: welcome,
              sender: 'bot',
            },
          ];

          // 👇 se booking non esiste, esci
          if (!this.config?.booking?.fields) {
            console.warn('⚠️ booking.fields non esiste nel JSON');
            return;
          }

          const group: { [key: string]: FormControl } = {};

          Object.entries(this.config.booking.fields).forEach(([key, field]: any) => {
            const validators = [];

            if (field?.required) {
              validators.push(Validators.required);
            }

            if (key === 'phone') {
              group['prefix'] = new FormControl('+39', {
                nonNullable: true,
                validators: [Validators.required],
              });
            }

            if (key === 'datetime') {
              validators.push(bookingDateValidator(this.config));
            }

            group[key] = new FormControl('', {
              nonNullable: true,
              validators,
            });
          });

          this.bookingForm = new FormGroup(group, {
            validators: phoneGroupValidator,
          });

          const datetimeControl = this.bookingForm.get('datetime');

          datetimeControl?.valueChanges.subscribe(() => {
            this.updateDatetimeError();
          });

          datetimeControl?.statusChanges.subscribe(() => {
            this.updateDatetimeError();
          });
        } catch (err) {
          console.error('🔥 ERRORE DENTRO SUBSCRIBE:', err);
        }
      },

      error: (err) => {
        console.error('❌ ERRORE HTTP:', err);
      },
    });
  }
  closeChat() {
    window.parent.postMessage({ type: 'BOT_CLOSE' }, '*');
  }
  onOverlayClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (target.classList.contains('chat-overlay')) {
      this.closeChat();
    }
  }
  @ViewChild('chatBody') chatBody!: ElementRef<HTMLDivElement>;
  userInput = '';

  messages: {
    text: string | SafeHtml;
    sender: 'user' | 'bot';
    isHtml?: boolean;
  }[] = [];

  botTyping = false;
  showPrefixDropdown = false;

  phonePrefixes = [
    { code: '+39', flag: '🇮🇹', name: 'Italy' },
    { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
    { code: '+33', flag: '🇫🇷', name: 'France' },
    { code: '+49', flag: '🇩🇪', name: 'Germany' },
    { code: '+34', flag: '🇪🇸', name: 'Spain' },
    { code: '+1', flag: '🇺🇸', name: 'United States' },
  ];

  selectedPrefix = this.phonePrefixes[0];

  togglePrefixDropdown() {
    this.showPrefixDropdown = !this.showPrefixDropdown;
  }

  selectPrefix(p: any) {
    this.selectedPrefix = p;
    this.bookingForm.get('prefix')?.setValue(p.code);
    this.showPrefixDropdown = false;
  }

  sendMessage() {
    if (!this.userInput.trim()) return;
    this.cancelMethod();
    const userText = this.userInput;
    this.showBookingForm = false;
    this.showMethod = false;
    // 1️⃣ Messaggio utente
    this.messages.push({ sender: 'user', text: userText });
    this.userInput = '';
    this.scrollToBottom();

    // 2️⃣ Typing
    this.botTyping = true;
    this.cdr.markForCheck();

    setTimeout(() => {
      this.zone.run(() => {
        this.botTyping = false;
        let openBookingForm = false;
        let botResponse = '';
        let isHtml = false;
        if (this.containsKeyword(userText, this.config.keywords[this.lang].insulti)) {
          botResponse = this.randomItem(this.config.responses[this.lang].insulti);
          isHtml = true;
        } else if (this.containsKeyword(userText, this.config.keywords[this.lang].prenotazione)) {
          botResponse = this.randomItem(this.config.responses[this.lang].prenotazione);
          isHtml = true;
          this.bookClick();
        } else if (this.containsKeyword(userText, this.config.keywords[this.lang].prezzi)) {
          botResponse = this.randomItem(this.config.responses[this.lang].prezzi);
          isHtml = true;
        } else if (this.containsKeyword(userText, this.config.keywords[this.lang].orari)) {
          isHtml = true;
          botResponse = this.randomItem(this.config.responses[this.lang].orari);
        } else if (this.containsKeyword(userText, this.config.keywords[this.lang].indirizzo)) {
          botResponse = this.randomItem(this.config.responses[this.lang].indirizzo);
          isHtml = true;
        } else if (this.containsKeyword(userText, this.config.keywords[this.lang].offerte)) {
          botResponse = this.randomItem(this.config.responses[this.lang].offerte);
          isHtml = true;
        } else if (this.containsKeyword(userText, this.config.keywords[this.lang].social)) {
          botResponse = this.randomItem(this.config.responses[this.lang].social);
          isHtml = true;
        } else if (this.containsKeyword(userText, this.config.keywords[this.lang].eventi)) {
          botResponse = this.randomItem(this.config.responses[this.lang].eventi);
          isHtml = true;
        } else if (this.containsKeyword(userText, this.config.keywords[this.lang].allergeni)) {
          botResponse = this.randomItem(this.config.responses[this.lang].allergeni);
          isHtml = true;
        } else if (this.containsKeyword(userText, this.config.keywords[this.lang].contatti)) {
          botResponse = this.randomItem(this.config.responses[this.lang].contatti);
          isHtml = true;
        } else if (this.containsKeyword(userText, this.config.keywords[this.lang].delivery)) {
          botResponse = this.randomItem(this.config.responses[this.lang].delivery);
          isHtml = true;
        } else if (this.containsKeyword(userText, this.config.keywords[this.lang].pagamenti)) {
          botResponse = this.randomItem(this.config.responses[this.lang].pagamenti);
          isHtml = true;
        } else if (this.containsKeyword(userText, this.config.keywords[this.lang].politiche)) {
          botResponse = this.randomItem(this.config.responses[this.lang].politiche);
          isHtml = true;
        } else if (this.containsKeyword(userText, this.config.keywords[this.lang].logistica)) {
          botResponse = this.randomItem(this.config.responses[this.lang].logistica);
          isHtml = true;
        } else if (this.containsKeyword(userText, this.config.keywords[this.lang].tempi)) {
          botResponse = this.randomItem(this.config.responses[this.lang].tempi);
          isHtml = true;
        } else if (this.containsKeyword(userText, this.config.keywords[this.lang].ringraziamenti)) {
          botResponse = this.randomItem(this.config.responses[this.lang].ringraziamenti);
          isHtml = true;
        } else if (this.containsKeyword(userText, this.config.keywords[this.lang].saluto)) {
          botResponse = this.randomItem(this.config.responses[this.lang].saluto);
          isHtml = true;
        }
        // ❓ FALLBACK
        else {
          isHtml = true;
          botResponse = this.randomItem(this.config.responses[this.lang].fallback);
        }

        this.messages.push({
          sender: 'bot',
          text: isHtml ? this.sanitizer.bypassSecurityTrustHtml(botResponse) : botResponse,
          isHtml,
        });

        this.cdr.markForCheck();
        this.scrollToBottom();
        if (openBookingForm) {
          setTimeout(() => {
            this.zone.run(() => {
              this.showBookingForm = true;
              this.cdr.markForCheck();
            });
          }, 800); // leggero delay per dare effetto "typing"
        }
      });
    }, 1500);
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.chatBody) {
        this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
      }
    }, 0);
  }
  showHours() {
    let hoursMessage = '';
    hoursMessage = this.randomItem(this.config.responses[this.lang].orari);

    this.messages.push({ text: hoursMessage, sender: 'bot' });
    this.scrollToBottom();
  }
  openMaps() {
    const address = encodeURIComponent(this.config.contact.address); // indirizzo del locale
    const url = `https://www.google.com/maps/search/?api=1&query=${address}`;
    window.open(url, '_blank'); // apre una nuova scheda / app maps
  }
  callNumber() {
    const phone = this.config.contact.phone;
    const tel = this.config.frasi[this.lang].tel;
    const htmlMessage = this.sanitizer.bypassSecurityTrustHtml(
      `${tel} <a href="tel:${phone}">${phone}</a>`,
    );

    this.messages.push({ text: htmlMessage, sender: 'bot', isHtml: true });
    this.scrollToBottom();

    setTimeout(() => {
      window.location.href = `tel:${phone}`;
    }, 500);
  }
  langMenuOpen = false;

  toggleLangMenu() {
    this.langMenuOpen = !this.langMenuOpen;
  }

  setLang(value: string) {
    this.lang = value;
    this.langMenuOpen = false;
    this.messages = [];
    this.onLanguageChange();
  }

  onLanguageChange() {
    this.cancelMethods();
    this.cancelBooking();
    let message =
      this.lang === 'it' ? 'Lingua impostata su Italiano 🇮🇹' : 'Language set to English 🇬🇧';

    this.messages.push({
      text: message,
      sender: 'bot',
      isHtml: true,
    });
    this.messages.push({
      text: this.config.responses[this.lang].benvenuto,
      sender: 'bot',
      isHtml: true,
    });
  }

  showBookingForm = false;
  booking = { name: '', datetime: '', notes: '', phone: '' };
  showMethod = false;
  bookNow() {
    this.bookingForm.reset();
    this.showBookingForm = true;
    this.showMethod = false;
    this.showQuickActions = true;
    this.scrollToBottom();
  }
  cancelMethod() {
    this.showMethod = false;
    this.showQuickActions = true;
  }
  openExternal(url: string) {
    window.open(url, '_blank', 'noopener');
  }

  bookClick1() {
    this.messages.push({
      text: this.randomItem(this.config.responses[this.lang].prenotazione),
      sender: 'bot',
      isHtml: true,
    });
    this.bookClick();
    this.scrollToBottom();
  }
  bookClick() {
    this.showMethod = true;
    this.showQuickActions = false;
  }
  cancelMethods() {
    this.showMethod = false;
    this.showQuickActions = true;
  }
  getBookingMethods() {
    return this.config.booking?.methods?.filter((m: any) => m.enabled);
  }

  cancelBooking() {
    this.bookingForm.reset();
    this.showBookingForm = false;
  }

  sendBookingWhatsApp() {
    if (this.bookingForm.invalid) return;

    const booking = this.bookingForm.value;
    const phoneNumber = this.config.booking.whatsappNumber; // numero del locale

    const message =
      `📅 *Nuova prenotazione*\n\n` +
      `👤 Nome: ${booking.name}\n` +
      `📞 Telefono: ${booking.prefix + booking.phone}\n` +
      `🕒 Data e ora: ${booking.datetime}\n` +
      `📝 Note: ${booking.notes || 'Nessuna'}\n
       Il ristorante ti risponderà a breve per la conferma 😊\n`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    this.messages.push({
      text: `${this.config.frasi[this.lang].bookConfirm}`,
      sender: 'bot',
    });
    this.bookingForm.reset();
    this.showBookingForm = false;
  }
  blockPlusDelete(event: KeyboardEvent) {
    const input = event.target as HTMLInputElement;

    // blocca backspace/delete se il cursore è subito dopo la +
    if (input.selectionStart === 1 && (event.key === 'Backspace' || event.key === 'Delete')) {
      event.preventDefault();
    }
  }

  restorePlus(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.value.startsWith('+')) {
      input.value = '+' + input.value.replace(/\+/g, '');
      this.bookingForm.get('phone')?.setValue(input.value, { emitEvent: false });
    }
  }
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD') // separa lettere da accenti
      .replace(/[\u0300-\u036f]/g, '') // rimuove accenti
      .replace(/[^a-z0-9\s]/g, '') // rimuove simboli strani
      .replace(/(.)\1+/g, '$1'); // riduce lettere ripetute (es: prennno -> preno)
  }

  private containsKeyword(text: string, keywords: string[]): boolean {
    const normalizedText = this.normalize(text);

    return keywords.some((k) => {
      const normalizedKeyword = this.normalize(k);

      // keyword corta → match parola intera
      if (normalizedKeyword.length <= 3) {
        return new RegExp(`\\b${normalizedKeyword}\\b`, 'i').test(normalizedText);
      }

      // keyword lunga → match permissivo
      return normalizedText.includes(normalizedKeyword);
    });
  }

  private randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  updateDatetimeError(): void {
    const control = this.bookingForm.get('datetime');
    if (!control || !control.invalid) {
      this.datetimeErrorMessage = null;
      return;
    }
    const errors = control.errors;
    if (!errors) {
      this.datetimeErrorMessage = null;
      return;
    }

    // ❌ Campo richiesto
    if (errors['required']) {
      this.datetimeErrorMessage = this.config.errors[this.lang].required;
      return;
    }

    // ❌ Data nel passato
    if (errors['pastDate']) {
      this.datetimeErrorMessage = this.config.errors[this.lang].pastDate;
      return;
    }

    // ❌ Min advance
    // ❌ Min advance
    if (errors['tooSoon']) {
      this.datetimeErrorMessage = this.config.errors[this.lang].tooSoon?.replace(
        '{{minutes}}',
        errors['tooSoon'].minutes,
      );
      return;
    }

    // ❌ Max advance
    if (errors['tooFar']) {
      this.datetimeErrorMessage = this.config.errors[this.lang].tooFar?.replace(
        '{{days}}',
        errors['tooFar'].days,
      );
      return;
    }

    // ❌ Giorno chiuso
    if (errors['closedToday']) {
      const day = errors['closedToday'].day;
      this.datetimeErrorMessage =
        this.config.errors[this.lang].closedToday[day] ??
        this.config.errors[this.lang].closedToday.default;
      return;
    }

    // ❌ Giorno chiuso per eccezione
    if (errors['closedByException']) {
      this.datetimeErrorMessage =
        this.config.errors[this.lang].closedByException?.replace(
          '{{reason}}',
          errors['closedByException'].reason,
        ) || 'Giorno chiuso per eccezione';
      return;
    }

    // ❌ Orario fuori slot
    if (errors['outsideHours']) {
      const slots = errors['outsideHours'].slots
        .map(
          (s: any) =>
            `${String(s.openH).padStart(2, '0')}:${String(s.openM).padStart(2, '0')}–` +
            `${String(s.closeH).padStart(2, '0')}:${String(s.closeM).padStart(2, '0')}`,
        )
        .join(' / ');

      this.datetimeErrorMessage = this.config.errors[this.lang].outsideHours?.replace(
        '{{slots}}',
        slots,
      );
      return;
    }

    // ✅ Nessun errore
    this.datetimeErrorMessage = null;
  }
}
// Assumiamo che "config" sia il tuo oggetto JSON
function applyThemeColors(config: any) {
  if (!config?.ui) return;

  const root = document.documentElement; // :root in CSS

  Object.entries(config.ui).forEach(([key, value]) => {
    // Convertiamo i nomi del JSON in nomi CSS --kebab-case
    const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVarName, value as string);
  });
}

export function bookingDateValidator(config: any): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;

    const selectedDate = new Date(value);
    const now = new Date();

    // 1️⃣ Data nel passato
    if (selectedDate.getTime() < now.getTime()) {
      return { pastDate: true };
    }

    // 2️⃣ MinAdvanceMinutes
    const minAdvance = config.booking.rules?.minAdvanceMinutes ?? 0;
    const minAdvanceDate = new Date(now.getTime() + minAdvance * 60 * 1000);
    if (selectedDate < minAdvanceDate) {
      return { tooSoon: { minutes: minAdvance } }; // "minutes" per il placeholder {{minutes}}
    }

    // Max advance

    // 3️⃣ MaxDaysInAdvance
    const maxDays = config.booking.rules?.maxDaysInAdvance ?? 365;
    const maxAdvanceDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
    if (selectedDate > maxAdvanceDate) {
      return { tooFar: { days: maxDays } }; // "days" per il placeholder {{days}}
    }

    // 4️⃣ Eccezioni (giorni chiusi)
    const dateStr = selectedDate.toISOString().split('T')[0];
    const exception = config.exceptions?.find((e: any) => e.date === dateStr);
    if (exception?.closed) {
      return { closedByException: { reason: exception.reason } };
    }
    // 5️⃣ Giorno della settimana
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[selectedDate.getDay()];
    const dayConfig = config.openingHours[dayName];

    if (!dayConfig || dayConfig.closed) {
      return { closedToday: { day: dayName } };
    }

    // 6️⃣ Controllo slot orario
    const hour = selectedDate.getHours();
    const minute = selectedDate.getMinutes();
    let validSlot = false;

    if (dayConfig.slots && dayConfig.slots.length) {
      for (const slot of dayConfig.slots) {
        const start = slot.openH * 60 + slot.openM;
        const end = slot.closeH * 60 + slot.closeM;
        const selected = hour * 60 + minute;
        if (selected >= start && selected <= end) {
          validSlot = true;
          break;
        }
      }
    }

    if (!validSlot) {
      return { outsideHours: { day: dayName, slots: dayConfig.slots } };
    }

    return null;
  };
}

export const phoneGroupValidator: ValidatorFn = (
  form: AbstractControl,
): ValidationErrors | null => {
  const prefixControl = form.get('prefix');
  const phoneControl = form.get('phone');

  if (!prefixControl || !phoneControl) return null;

  const prefix = prefixControl.value;
  const phone = phoneControl.value;

  if (!phone) return null;

  const fullNumber = prefix + phone;
  const parsed = parsePhoneNumberFromString(fullNumber);

  if (!parsed || !parsed.isValid()) {
    // 🔥 Forziamo errore sul singolo campo phone
    phoneControl.setErrors({ invalidPhone: true });

    return { invalidPhone: true };
  }

  // 🔥 Rimuoviamo errore se torna valido
  if (phoneControl.hasError('invalidPhone')) {
    phoneControl.setErrors(null);
  }

  return null;
};
