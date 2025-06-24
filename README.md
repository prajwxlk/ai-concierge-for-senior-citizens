# AI Concierge for Senior Citizens

I built this project for Lightspeed's Warpspeed Hackathon. I built this as a solution for Senior Ctizens in India to be able to use a concierge service which can help them with day to day tasks like ordering groceries, medicine, booking doctor/lab appointments, weather updates, news cast, etc. 

We can make use of AI Agents to stitch together different services and applications to provide senior citizens with a concierge service which can do all the basic tasks. In this code, I have used APIs for weather and news which work with real time data whereas for the other use cases I have used mock APIs to accomplish the same as I was short on time.

The use cases currently built into the code right now are : 
1. Cab Ordering - done
2. Grocery/Medicine Refill & Delivery - done
3. booking doctor/lab appointments - done
4. weather updates - done
5. newscast - done

Senior Citizens in India can make use of this as they can talk in their local language. This is made possible by utilising Sarvam AI's text to speech and speech to text APIs. This allows support for users to talk in several Indian Languages.

The way this works is that the user dials up the number to the agent, then they can tell the agent what they want or need. The agent can understand several indian languages so it understand what the user is trying to say. The agent then according to the user's input, calls appropriate functions which perform the task and the agent then responds to the user in the same language.

Here's how it works : 
User talks to the AI Agent -> Speech to Text Translate (Translate indian languages to english) -> Text sent to OpenAI -> OpenAI understands query and accordingly calls appropriate functions -> Appropriate function performs task -> OpenAI generates response -> Text to Speech (Speech is generated in the local language the user spoke in) -> Speech played on the clientside to respond to the user.

Issues that need to be fixed before launch : 
- sarvam ai audio cutting off for longer conversation
- sarvam ai not calling out numbers
- sarvam ai sometimes not translating properly