# DoohItBot
###### A telegram bot made for reminders with periodic notifications until the task has been completed. This is essentially a Telegram bot that is made to annoy you until you complete the task that you have asked to be reminded about.


## Usage
The bot is used by sending commands through Telegram to the bot @DoohItBot.

* **/help** <br/>
  ###### Shows the user what commands are available and how to use the bot.


* **/remindme** <br/>
  ###### The command that is used to create a new reminder.<br/>
  ```
  Examples of different formats
  /remindme daily 15:00 1 minute Create new reminder
  /remindme today 08:00 40 minutes Create new reminder
  /remindme mondays 21:00 5 minutes Create new reminder
  /remindme tuesday 12:00 10 minutes Create new reminder
  ```
  ###### Using the plural of a day or 'daily' will create a recurring reminder on those days. Using the singular of a day or 'today' will     create a non recurring reminder.


* **/reminders**<br/>
  ###### Displays a list of currently active reminders. Will also display recurring reminders despite having been completed recently.


* **/done**
  ###### Allows the user to stop notifications for a reminder or to complete a non recurring reminder and stop notifications. If the   reminder is recurring and notifications haven't started yet, it will be completed for this cycle and notifications will not appear until next cycle.

  ###### Note: Currently it only accepts the precise name of the reminder. Another, better solution is in the pipeline.

## Road map

Upcoming features will be listed here in any order.

* ~~**Task persistance** - *High priority*~~
  ###### Currently the bot is vulnerable to server shutdown as cron jobs are only saved in the current instance. All reminders are saved in a mongo database along with vital information and this feature will start all tasks again upon restart.


* **Tests**
  ###### Implement tests to ensure bot is working as intended whenever bugs are fixed or new features are implemented.

* **Find easier solution for /done command**
  ###### Currently the name has to match exactly the name that was inserted when created. This can be cumbersome and an easier solution should be implemented.

* **Implement /remove command**
  ###### Currently recurring reminders will continue forever and can't be completed or removed. Implement a function that allows the removal of recurring reminders.
