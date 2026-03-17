"""Interactive CLI for local testing."""

import asyncio
from agent import agent


async def main():
    print("CLI mode started. Type 'quit' or 'exit' to end.")
    while True:
        try:
            user_input = input("\n> ")
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break
        if not user_input.strip():
            continue
        if user_input.strip().lower() in ("quit", "exit"):
            break
        async for event in agent.stream_async(user_input):
            if "data" in event:
                print(event["data"], end="", flush=True)
        print()


if __name__ == "__main__":
    asyncio.run(main())
