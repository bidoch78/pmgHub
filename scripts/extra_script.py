Import("env")

import csv
import os

PROJECT_DIR = env.subst("$PROJECT_DIR")
BUILD_DIR = env.subst("$BUILD_DIR")
PARTITIONS_FILE = os.path.join(PROJECT_DIR, "partitions.csv")

PARTITION_NAME = "web"

def parse_value(value):
    value = value.strip().lower()

    if value.startswith("0x"):
        return int(value, 16)

    if value.endswith("k"):
        return int(value[:-1]) * 1024

    if value.endswith("m"):
        return int(value[:-1]) * 1024 * 1024

    return int(value)


def find_partition(name):
    with open(PARTITIONS_FILE, "r", encoding="utf-8") as f:
        reader = csv.reader(f)

        for row in reader:
            if not row:
                continue

            label = row[0].strip()

            if not label or label.startswith("#"):
                continue

            if label != name:
                continue

            if len(row) < 5:
                raise RuntimeError(
                    f"Invalid partition definition for '{name}'"
                )

            offset = row[3].strip()
            size = row[4].strip()

            if not offset:
                raise RuntimeError(
                    f"Partition '{name}' requires an explicit offset"
                )

            if not size:
                raise RuntimeError(
                    f"Partition '{name}' requires an explicit size"
                )

            return {
                "offset": parse_value(offset),
                "size": parse_value(size)
            }

    raise RuntimeError(
        f"Partition '{name}' not found in {PARTITIONS_FILE}"
    )


def upload_web(source, target, env):

    partition = find_partition(PARTITION_NAME)

    image = os.path.join(
        BUILD_DIR,
        "littlefs.bin"
    )

    if not os.path.isfile(image):
        raise RuntimeError(
            f"LittleFS image not found: {image}"
        )

    offset = "0x{:X}".format(partition["offset"])

    print()
    print("========================================")
    print(" pmgHub WEB upload")
    print("========================================")
    print(f"Partition : {PARTITION_NAME}")
    print(f"Offset    : {offset}")
    print(f"Size      : {partition['size']} bytes")
    print(f"Image     : {image}")
    print("========================================")
    print()

    #
    # Reuse PlatformIO uploader.
    #
    # We replace only the arguments because uploadfs chose
    # the wrong filesystem partition in our multi-FS layout.
    #

    uploader = env.subst("$UPLOADER")

    if not uploader:
        raise RuntimeError(
            "PlatformIO uploader not available"
        )

    upload_port = env.subst("$UPLOAD_PORT")
    upload_speed = env.subst("$UPLOAD_SPEED")

    flags = [
        "--chip",
        "esp32s3",

        "--port",
        upload_port,

        "--baud",
        upload_speed,

        "--before",
        "default_reset",

        "--after",
        "hard_reset",

        "write_flash",

        offset,
        image
    ]

    command = env.Command(
        target=None,
        source=None,
        action=[
            env.VerboseAction(
                '"{}" {}'.format(
                    uploader,
                    " ".join(flags)
                ),
                "Uploading WEB filesystem..."
            )
        ]
    )

    env.Execute(command)


env.AddCustomTarget(
    name="uploadweb",
    dependencies=["buildfs"],
    actions=upload_web,
    title="Upload Web",
    description="Build and upload pmgHub WEB LittleFS partition"
)