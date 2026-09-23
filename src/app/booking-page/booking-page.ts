import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './booking-page.html',
  styleUrl: './booking-page.css'
})
export class BookingPage implements OnInit {

  currentStep = 1;
  currentLang = 'it';

  selectedDate: string = '';
  selectedGuests: number = 0;
  selectedTime: string = '';

  // Giorni disponibili
  calendarDays = [
    { number: 24, date: '2026-09-24', available: true },
    { number: 25, date: '2026-09-25', available: true },
    { number: 26, date: '2026-09-26', available: true },
    { number: 27, date: '2026-09-27', available: true },
    { number: 28, date: '2026-09-28', available: true }
  ];

  // Numero di persone disponibili
  guestOptions = [1, 2, 3, 4, 5, 6, 7, 8];

  // Orari disponibili
  timeOptions = [
    '12:00',
    '12:30',
    '13:00',
    '19:30',
    '20:00',
    '20:30',
    '21:00',
    '21:30'
  ];

  userDataForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {

    // Recupera la lingua passata nell'URL
    this.route.queryParams.subscribe(params => {
      if (params['lang']) {
        this.currentLang = params['lang'];
      }
    });

    // Inizializza il form
    this.userDataForm = this.fb.group({
      salutation: ['Sig'],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required]
    });
  }

  goToStep(step: number): void {
    this.currentStep = step;
  }

  onDateSelect(date: string): void {
    this.selectedDate = date;
    this.goToStep(2);
  }

  onGuestsSelect(count: number): void {
    this.selectedGuests = count;
    this.goToStep(3);
  }

  onTimeSelect(time: string): void {
    this.selectedTime = time;
    this.goToStep(4);
  }

  onFinalSubmit(): void {

    if (this.userDataForm.invalid) {
      this.userDataForm.markAllAsTouched();
      return;
    }

    const finalData = {
      dataPrenotazione: this.selectedDate,
      coperti: this.selectedGuests,
      orario: this.selectedTime,
      cliente: this.userDataForm.value
    };

    console.log(
      'Invio dati al server in corso...',
      finalData
    );

    // Qui inseriremo la logica di salvataggio definitiva
  }
}
