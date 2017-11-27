#!/bin/sh -e
make -f "content/make.mk"
python content/bake.py content www

