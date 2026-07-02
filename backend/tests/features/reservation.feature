Feature: Making a reservation
  As a cinema customer
  I want to reserve seats for screenings
  So that I can watch movies with guaranteed seating

  Scenario: Customer reserves an available seat
    Given a screening exists for movie "Inception" priced at 30 PLN
    And seat "A1" is available
    When customer "Jan Kowalski" reserves seat "A1"
    Then the reservation is created with status "confirmed"
    And the reservation price is 30.00 PLN

  Scenario: Seat cannot be double-booked
    Given a screening exists for movie "Inception" priced at 30 PLN
    And seat "A1" is available
    When customer "Jan Kowalski" reserves seat "A1"
    And customer "Anna Nowak" tries to reserve seat "A1"
    Then the second reservation is rejected

  Scenario: Loyal customer gets a discount
    Given a screening exists for movie "Inception" priced at 30 PLN
    And customer "Jan Kowalski" already has 5 confirmed reservations
    When customer "Jan Kowalski" reserves seat "B2"
    Then the reservation price is 27.00 PLN
    And a discount of 10 percent is applied

  Scenario: Cancelling a reservation frees the seat
    Given a screening exists for movie "Inception" priced at 30 PLN
    And seat "A1" is available
    When customer "Jan Kowalski" reserves seat "A1"
    And customer "Jan Kowalski" cancels the reservation
    Then seat "A1" is available again
