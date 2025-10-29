#!/usr/bin/env python3

# Setup script for IOC - Intent-Oriented Computing

from setuptools import setup, find_packages
from pathlib import Path

# Read README
readme_file = Path(__file__).parent / "README.md"
long_description = readme_file.read_text() if readme_file.exists() else ""

setup(
    name="ioc-lang",
    version="0.3.0",
    description="Intent-Oriented Computing: Separate what from how",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="IOC Contributors",
    author_email="",
    url="",
    license="Proprietary",
    
    packages=find_packages(exclude=["tests", "examples"]),
    
    # Package data
    package_data={
        "": ["*.md", "*.txt"],
    },
    
    # Dependencies
    install_requires=[
        # No external dependencies - pure Python!
    ],
    
    # Optional dependencies
    extras_require={
        "dev": [
            "pytest>=7.0",
            "black>=22.0",
            "mypy>=0.990",
        ],
        "viz": [
            "graphviz>=0.20",  # For graph visualization
        ],
    },
    
    # Entry points for CLI
    entry_points={
        "console_scripts": [
            "ioc=ioc_cli:main",
        ],
    },
    
    # Python version requirement
    python_requires=">=3.9",
    
    # Classifiers
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Compilers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "License :: Other/Proprietary License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Programming Language :: Python :: 3.13",
    ],
    
    keywords="compiler optimization intent graph data-processing",
    
    project_urls={},
)
